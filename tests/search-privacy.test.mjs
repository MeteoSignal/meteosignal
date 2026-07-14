import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { initSearch } from "../js/components/search.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SEARCH_SOURCE = fs.readFileSync(path.join(ROOT, "js", "components", "search.js"), "utf8");
const APP_SOURCE = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
const GEOCODING_SOURCE = fs.readFileSync(path.join(ROOT, "js", "services", "geocoding.service.js"), "utf8");
const FORM_SOURCE = INDEX_SOURCE.match(/<form\b[^>]*data-search-form[\s\S]*?<\/form>/)?.[0] ?? "";
const FORM_TAG = FORM_SOURCE.match(/<form\b[^>]*>/)?.[0] ?? "";
const INPUT_TAG = FORM_SOURCE.match(/<input\b[^>]*id="city-search"[^>]*>/)?.[0] ?? "";

test("le repli HTML GET ne peut plus placer la ville dans l'URL", () => {
    assert.match(FORM_TAG, /\baction="\.\/"/);
    assert.match(FORM_TAG, /\bmethod="get"/);
    assert.doesNotMatch(INPUT_TAG, /\sname\s*=/);
    assert.match(INPUT_TAG, /\bmaxlength="120"/);

    const fallbackUrl = new URL(getAttribute(FORM_TAG, "action"), "https://example.test/app/index.html");
    const successfulControls = new URLSearchParams();
    const inputName = getAttribute(INPUT_TAG, "name");

    if (inputName) {
        successfulControls.set(inputName, "Toulouse");
    }

    fallbackUrl.search = successfulControls.toString();

    assert.equal(fallbackUrl.href, "https://example.test/app/");
    assert.equal(fallbackUrl.search, "");
    assert.doesNotMatch(fallbackUrl.href, /Toulouse|city=/i);
});

test("submit, bouton et Entree utilisent toujours le gestionnaire JavaScript", async (t) => {
    const calls = [];
    const harness = createSearchHarness(t, async (query) => {
        calls.push(query);
        return [];
    });
    const button = FORM_SOURCE.match(/<button\b[^>]*aria-label="Lancer la recherche"[^>]*>/)?.[0] ?? "";

    assert.match(button, /\btype="submit"/);
    assert.match(SEARCH_SOURCE, /form\.addEventListener\("submit"/);
    assert.match(SEARCH_SOURCE, /event\.preventDefault\(\)/);

    harness.input.value = "  Saint   Gaudens  ";
    const buttonSubmit = createPreventableEvent();
    await harness.form.emit("submit", buttonSubmit);

    harness.input.value = "Paris";
    const enterKeydown = createPreventableEvent({ key: "Enter" });
    await harness.input.emit("keydown", enterKeydown);
    const enterSubmit = createPreventableEvent();
    await harness.form.emit("submit", enterSubmit);

    assert.equal(buttonSubmit.defaultPrevented, true);
    assert.equal(enterKeydown.defaultPrevented, false);
    assert.equal(enterSubmit.defaultPrevented, true);
    assert.deepEqual(calls, ["Saint Gaudens", "Paris"]);
    assert.equal(harness.form.getAttribute("aria-busy"), "false");
});

test("une saisie excessive ferme les suggestions, annule l'ancienne demande et reste accessible", async (t) => {
    let fetchCalls = 0;
    let activeSignal;
    const harness = createSearchHarness(t, async (query, { signal }) => {
        fetchCalls += 1;
        activeSignal = signal;
        return new Promise((resolve, reject) => rejectOnAbort(signal, reject));
    });

    harness.input.value = "Toulouse";
    const pendingSubmit = harness.form.emit("submit", createPreventableEvent());
    await Promise.resolve();

    harness.suggestions.hidden = false;
    harness.input.setAttribute("aria-expanded", "true");
    harness.input.value = "😀".repeat(121);
    await harness.input.emit("input");
    await pendingSubmit;

    assert.equal(fetchCalls, 1);
    assert.equal(activeSignal.aborted, true);
    assert.equal(harness.suggestions.hidden, true);
    assert.equal(harness.input.getAttribute("aria-expanded"), "false");
    assert.equal(harness.input.validationMessage, "La recherche est limitée à 120 caractères.");
    assert.equal(harness.status.textContent, "La recherche est limitée à 120 caractères.");
    assert.equal(harness.form.getAttribute("aria-busy"), "false");
});

test("une nouvelle recherche annule l'ancienne et ignore sa reponse obsolete", async (t) => {
    let firstSignal;
    let resolveFirst;
    let calls = 0;
    const harness = createSearchHarness(t, async (query, { signal }) => {
        calls += 1;

        if (calls === 1) {
            firstSignal = signal;
            return new Promise((resolve) => {
                resolveFirst = resolve;
            });
        }

        return [];
    });

    harness.input.value = "Toulouse";
    const firstSubmit = harness.form.emit("submit", createPreventableEvent());
    await Promise.resolve();

    harness.input.value = "Paris";
    await harness.form.emit("submit", createPreventableEvent());

    assert.equal(firstSignal.aborted, true);
    assert.equal(harness.status.textContent, "Aucun lieu trouvé.");
    assert.equal(harness.input.value, "Paris");

    resolveFirst([{
        name: "Toulouse",
        label: "Toulouse, France",
        latitude: 43.6,
        longitude: 1.44
    }]);
    await firstSubmit;

    assert.equal(harness.input.value, "Paris");
    assert.equal(harness.status.textContent, "Aucun lieu trouvé.");
    assert.equal(harness.suggestions.hidden, true);
    assert.equal(harness.form.getAttribute("aria-busy"), "false");
});

test("un collage excessif est refuse sans troncature silencieuse", async (t) => {
    let fetchCalls = 0;
    const harness = createSearchHarness(t, async () => {
        fetchCalls += 1;
        return [];
    });
    const pasteEvent = createPreventableEvent({
        clipboardData: {
            getData(type) {
                assert.equal(type, "text/plain");
                return "é".repeat(121);
            }
        }
    });

    harness.input.value = "";
    harness.input.selectionStart = 0;
    harness.input.selectionEnd = 0;
    await harness.input.emit("paste", pasteEvent);

    assert.equal(pasteEvent.defaultPrevented, true);
    assert.equal(harness.input.value, "");
    assert.equal(fetchCalls, 0);
    assert.equal(harness.input.validationMessage, "La recherche est limitée à 120 caractères.");
    assert.equal(harness.status.textContent, "La recherche est limitée à 120 caractères.");
});

test("un timeout reste visible et rend immediatement le formulaire reutilisable", async (t) => {
    const reportedErrors = [];
    const timeoutError = Object.assign(new Error("Délai dépassé"), {
        name: "TimeoutError",
        code: "GEOCODING_TIMEOUT"
    });
    const harness = createSearchHarness(
        t,
        async () => { throw timeoutError; },
        (error) => reportedErrors.push(error)
    );

    harness.input.value = "Toulouse";
    await harness.form.emit("submit", createPreventableEvent());

    assert.equal(harness.form.getAttribute("aria-busy"), "false");
    assert.equal(harness.input.validationMessage, "Recherche indisponible.");
    assert.equal(harness.status.textContent, "Recherche indisponible.");
    assert.deepEqual(reportedErrors, [timeoutError]);
});

test("la combobox et les deux regions live P1C sont conservees", () => {
    assert.match(INPUT_TAG, /\brole="combobox"/);
    assert.match(INPUT_TAG, /\baria-autocomplete="list"/);
    assert.match(INPUT_TAG, /\baria-controls="city-search-suggestions"/);
    assert.match(INPUT_TAG, /\baria-expanded="false"/);
    assert.match(SEARCH_SOURCE, /\["ArrowDown", "ArrowUp", "Home", "End"\]/);
    assert.match(SEARCH_SOURCE, /event\.key === "Escape"/);
    assert.equal((INDEX_SOURCE.match(/\baria-live=/g) ?? []).length, 2);
});

test("la revision P1D invalide toute la chaine de recherche sans toucher au CSS", () => {
    assert.match(INDEX_SOURCE, /js\/app\.js\?v=1\.4\.2-w3c-feedback/);
    assert.match(APP_SOURCE, /components\/search\.js\?v=1\.4\.2-w3c-feedback/);
    assert.match(SEARCH_SOURCE, /core\/location-search\.js\?v=1\.4\.2-w3c-feedback/);
    assert.match(SEARCH_SOURCE, /services\/geocoding\.service\.js\?v=1\.4\.2-w3c-feedback/);
    assert.match(GEOCODING_SOURCE, /core\/location-search\.js\?v=1\.4\.2-w3c-feedback/);
    assert.equal(
        (INDEX_SOURCE.match(/css\/[^"']+\?v=1\.4\.2-w3c-feedback/g) ?? []).length,
        5
    );
    assert.doesNotMatch(INDEX_SOURCE, /css\/[^"']+\?v=1\.4\.1-/);
});

function createSearchHarness(t, searchLocationsImpl, onError = () => {}) {
    const previousDocument = globalThis.document;
    const form = new FakeElement();
    const input = new FakeElement();
    const suggestions = new FakeElement();
    const status = new FakeElement();
    const document = {
        querySelector(selector) {
            return new Map([
                ["[data-search-form]", form],
                ["#city-search", input],
                ["[data-search-suggestions]", suggestions],
                ["#search-status", status]
            ]).get(selector) ?? null;
        },
        addEventListener() {}
    };

    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
    globalThis.document = document;
    t.after(() => {
        globalThis.document = previousDocument;
    });

    initSearch({ searchLocationsImpl, onError });
    return { form, input, suggestions, status };
}

class FakeElement {
    constructor() {
        this.attributes = new Map();
        this.dataset = {};
        this.hidden = false;
        this.innerHTML = "";
        this.listeners = new Map();
        this.textContent = "";
        this.validationMessage = "";
        this.value = "";
        this.selectionStart = null;
        this.selectionEnd = null;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    async emit(type, event = {}) {
        for (const listener of this.listeners.get(type) ?? []) {
            await listener(event);
        }
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    setCustomValidity(message) {
        this.validationMessage = message;
    }

    reportValidity() {
        return this.validationMessage === "";
    }

    querySelectorAll() {
        return [];
    }

    contains() {
        return false;
    }
}

function createPreventableEvent(properties = {}) {
    return {
        ...properties,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function rejectOnAbort(signal, reject) {
    const rejectAbort = () => {
        const error = new Error("Recherche annulée");
        error.name = "AbortError";
        reject(error);
    };

    if (signal.aborted) {
        rejectAbort();
        return;
    }

    signal.addEventListener("abort", rejectAbort, { once: true });
}

function getAttribute(tag, name) {
    return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null;
}
