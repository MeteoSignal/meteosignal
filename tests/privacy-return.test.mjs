import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
    PRIVACY_RETURN_MAX_AGE_MS,
    PRIVACY_RETURN_STORAGE_KEY,
    captureScrollPosition,
    createPrivacyReturnContext,
    getSafeReturnMethod,
    isPlainPrimaryActivation,
    parsePrivacyReturnContext,
    restorePrivacyReturnContext
} from "../js/privacy-return.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const PRIVACY_SOURCE = read("confidentialite.html");
const RESPONSIVE_SOURCE = read("css/responsive.css");
const MODULE_SOURCE = read("js/privacy-return.js");
const SW_SOURCE = read("sw.js");
const NOW = 1_750_000_000_000;
const ORIGIN = "https://meteosignal.example";

test("le contexte temporaire conserve seulement le retour, le focus et le scroll", () => {
    const context = createPrivacyReturnContext({
        returnUrl: `${ORIGIN}/index.html?source=pwa#alertes-meteo`,
        origin: ORIGIN,
        scroll: { target: "app-shell", x: 0, y: 1820 },
        timestamp: NOW
    });

    assert.deepEqual(context, {
        returnPath: "/index.html?source=pwa#alertes-meteo",
        focusId: "privacy-footer-link",
        scroll: { target: "app-shell", x: 0, y: 1820 },
        timestamp: NOW
    });
    assert.equal(JSON.stringify(context).includes("Toulouse"), false);
});

test("une URL externe ne peut jamais devenir un chemin de retour", () => {
    assert.equal(createPrivacyReturnContext({
        returnUrl: "https://example.net/previous",
        origin: ORIGIN,
        timestamp: NOW
    }), null);
});

test("un contexte valide est relu pendant sa courte duree de vie", () => {
    const value = JSON.stringify(validContext());
    assert.deepEqual(parsePrivacyReturnContext(value, {
        origin: ORIGIN,
        now: NOW + PRIVACY_RETURN_MAX_AGE_MS
    }), validContext());
});

test("les contextes anciens, futurs ou mal formes sont ignores", () => {
    assert.equal(parsePrivacyReturnContext("{", { origin: ORIGIN, now: NOW }), null);
    assert.equal(parsePrivacyReturnContext({ ...validContext(), timestamp: NOW - PRIVACY_RETURN_MAX_AGE_MS - 1 }, {
        origin: ORIGIN,
        now: NOW
    }), null);
    assert.equal(parsePrivacyReturnContext({ ...validContext(), timestamp: NOW + 1 }, {
        origin: ORIGIN,
        now: NOW
    }), null);
    assert.equal(parsePrivacyReturnContext({ ...validContext(), scroll: { target: "body", x: 0, y: 2 } }, {
        origin: ORIGIN,
        now: NOW
    }), null);
});

test("seule la cle de focus stable des regles est acceptee", () => {
    assert.equal(parsePrivacyReturnContext({ ...validContext(), focusId: "#footer a" }, {
        origin: ORIGIN,
        now: NOW
    }), null);
});

test("un contexte d'une autre origine est ignore", () => {
    assert.equal(parsePrivacyReturnContext({ ...validContext(), returnPath: "https://example.net/" }, {
        origin: ORIGIN,
        now: NOW
    }), null);
});

test("seul un clic principal normal de meme origine peut etre intercepte", () => {
    const link = createLink(`${ORIGIN}/confidentialite.html`);
    const event = createClickEvent();

    assert.equal(isPlainPrimaryActivation(event, link, `${ORIGIN}/`), true);
    assert.equal(isPlainPrimaryActivation({ ...event, button: 1 }, link, `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation({ ...event, ctrlKey: true }, link, `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation({ ...event, metaKey: true }, link, `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation({ ...event, shiftKey: true }, link, `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation({ ...event, altKey: true }, link, `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation(event, createLink(`${ORIGIN}/confidentialite.html`, "_blank"), `${ORIGIN}/`), false);
    assert.equal(isPlainPrimaryActivation(event, createLink("https://example.net/"), `${ORIGIN}/`), false);
});

test("un lien de telechargement n'est jamais intercepte", () => {
    const link = createLink(`${ORIGIN}/confidentialite.html`);
    link.hasAttribute = (name) => name === "download";
    assert.equal(isPlainPrimaryActivation(createClickEvent(), link, `${ORIGIN}/`), false);
});

test("l'historique est utilise seulement quand le referent correspond au retour interne", () => {
    const context = validContext();

    assert.equal(getSafeReturnMethod(context, {
        origin: ORIGIN,
        referrer: `${ORIGIN}/index.html`,
        historyLength: 3
    }), "history");
    assert.equal(getSafeReturnMethod(context, {
        origin: ORIGIN,
        referrer: "https://example.net/previous",
        historyLength: 8
    }), "location");
    assert.equal(getSafeReturnMethod(context, {
        origin: ORIGIN,
        referrer: `${ORIGIN}/confidentialite.html`,
        historyLength: 3
    }), "location");
});

test("le scroll interne mobile est capture sans toucher au scroll global", () => {
    const appShell = {
        clientHeight: 500,
        scrollHeight: 1700,
        scrollLeft: 3,
        scrollTop: 940
    };
    const documentRef = {
        documentElement: { scrollLeft: 0, scrollTop: 12 },
        querySelector: () => appShell
    };
    const windowRef = {
        scrollX: 0,
        scrollY: 12,
        getComputedStyle: () => ({ overflowY: "auto" })
    };

    assert.deepEqual(captureScrollPosition(documentRef, windowRef), {
        target: "app-shell",
        x: 3,
        y: 940
    });
});

test("le scroll de la fenetre est capture sur desktop", () => {
    const documentRef = {
        documentElement: { scrollLeft: 0, scrollTop: 720 },
        querySelector: () => null
    };
    const windowRef = { scrollX: 0, scrollY: 720 };

    assert.deepEqual(captureScrollPosition(documentRef, windowRef), {
        target: "window",
        x: 0,
        y: 720
    });
});

test("une navigation normale restaure le scroll puis le focus sans defilement secondaire", () => {
    const harness = createRestoreHarness();
    const context = validContext();
    harness.storage.setItem(PRIVACY_RETURN_STORAGE_KEY, JSON.stringify(context));

    assert.equal(restorePrivacyReturnContext({
        context,
        ...harness,
        useNativeScroll: false
    }), true);
    assert.deepEqual(harness.scrollCalls, [[0, 1820]]);
    assert.deepEqual(harness.focusCalls, [{ preventScroll: true }]);
    assert.equal(harness.storage.getItem(PRIVACY_RETURN_STORAGE_KEY), null);
});

test("un retour historique conserve la restauration native du scroll", () => {
    const harness = createRestoreHarness();
    const context = validContext();

    assert.equal(restorePrivacyReturnContext({
        context,
        ...harness,
        useNativeScroll: true
    }), true);
    assert.deepEqual(harness.scrollCalls, []);
    assert.deepEqual(harness.focusCalls, [{ preventScroll: true }]);
});

test("un contexte n'est pas consomme si la cible de focus manque", () => {
    const harness = createRestoreHarness({ target: null });
    const context = validContext();
    harness.storage.setItem(PRIVACY_RETURN_STORAGE_KEY, JSON.stringify(context));

    assert.equal(restorePrivacyReturnContext({ context, ...harness }), false);
    assert.notEqual(harness.storage.getItem(PRIVACY_RETURN_STORAGE_KEY), null);
});

test("les deux retours gardent href et le marquage progressif", () => {
    assert.equal((PRIVACY_SOURCE.match(/href="\.\/"/g) ?? []).length, 2);
    assert.equal((PRIVACY_SOURCE.match(/data-privacy-return/g) ?? []).length, 2);
    assert.match(INDEX_SOURCE, /id="privacy-footer-link"[^>]*href="confidentialite\.html"/);
});

test("le module partage est charge sur les deux pages avec la meme revision", () => {
    const reference = /js\/privacy-return\.js\?v=1\.5\.5-release/g;
    assert.equal((INDEX_SOURCE.match(reference) ?? []).length, 1);
    assert.equal((PRIVACY_SOURCE.match(reference) ?? []).length, 1);
    assert.match(SW_SOURCE, /"\.\/js\/privacy-return\.js"/);
});

test("le contexte temporaire n'utilise ni localStorage ni restauration globale manuelle", () => {
    assert.match(MODULE_SOURCE, /sessionStorage/);
    assert.doesNotMatch(MODULE_SOURCE, /localStorage/);
    assert.doesNotMatch(MODULE_SOURCE, /scrollRestoration/);
    assert.match(PRIVACY_RETURN_STORAGE_KEY, /^meteosignal:/);
});

test("les deux corrections d'espacement autorisent les retours a la ligne", () => {
    assert.match(read("css/privacy.css"), /\.privacy-card\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    assert.match(RESPONSIVE_SOURCE, /\.forecast-meta span\s*\{[^}]*overflow:\s*visible;[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*normal;/s);
});

function validContext() {
    return {
        returnPath: "/index.html",
        focusId: "privacy-footer-link",
        scroll: { target: "window", x: 0, y: 1820 },
        timestamp: NOW
    };
}

function createClickEvent(overrides = {}) {
    return {
        altKey: false,
        button: 0,
        ctrlKey: false,
        defaultPrevented: false,
        metaKey: false,
        shiftKey: false,
        ...overrides
    };
}

function createLink(href, target = "") {
    return {
        href,
        target,
        hasAttribute: () => false
    };
}

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key)
    };
}

function createRestoreHarness({ target = undefined } = {}) {
    const storage = createStorage();
    const scrollCalls = [];
    const focusCalls = [];
    const documentRef = {
        activeElement: null,
        documentElement: { clientHeight: 720, clientWidth: 1280 },
        querySelector: () => null,
        getElementById() {
            if (target === null) {
                return null;
            }

            return target ?? focusTarget;
        }
    };
    const focusTarget = {
        getBoundingClientRect: () => ({ top: 640, left: 20, bottom: 670, right: 220, width: 200, height: 30 }),
        scrollIntoView() {},
        focus(options) {
            focusCalls.push(options);
            documentRef.activeElement = this;
        }
    };
    const windowRef = {
        location: { href: `${ORIGIN}/index.html`, origin: ORIGIN },
        getComputedStyle: () => ({ display: "inline", visibility: "visible" }),
        scrollTo: (...args) => scrollCalls.push(args)
    };

    return { documentRef, windowRef, storage, scrollCalls, focusCalls };
}

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
