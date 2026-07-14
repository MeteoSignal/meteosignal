import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class FakeClassList {
    constructor(element) {
        this.element = element;
    }

    contains(token) {
        return this.element.className.split(/\s+/).filter(Boolean).includes(token);
    }

    toggle(token, force) {
        const tokens = new Set(this.element.className.split(/\s+/).filter(Boolean));
        const enabled = force === undefined ? !tokens.has(token) : Boolean(force);

        if (enabled) {
            tokens.add(token);
        } else {
            tokens.delete(token);
        }

        this.element.className = [...tokens].join(" ");
        return enabled;
    }
}

class FakeElement {
    constructor(tagName, ownerDocument) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.parentElement = null;
        this.children = [];
        this.attributes = new Map();
        this.dataset = {};
        this.className = "";
        this.classList = new FakeClassList(this);
        this.style = {};
        this.hidden = false;
        this.disabled = false;
        this.textContent = "";
        this.type = "";
        this.id = "";
        this.scrollTop = 0;
        this.focusCalls = [];
        this.focusDisabled = false;
        this.forceDisconnected = false;
        this.listeners = new Map();
    }

    get isConnected() {
        return !this.forceDisconnected && this.ownerDocument.documentElement.contains(this);
    }

    set innerHTML(value) {
        if (this.contains(this.ownerDocument.activeElement)) {
            this.ownerDocument.activeElement = this.ownerDocument.body;
        }

        for (const child of this.children) {
            child.parentElement = null;
        }

        this.children = [];
        this._innerHTML = value;

        if (Object.hasOwn(this.dataset, "favoritesList")) {
            this.ownerDocument.renderGeneration += 1;
        }
    }

    get innerHTML() {
        return this._innerHTML ?? "";
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    contains(element) {
        return this === element || this.children.some((child) => child.contains(element));
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));

        if (name === "id") {
            this.id = String(value);
        }
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    removeAttribute(name) {
        this.attributes.delete(name);

        if (name === "id") {
            this.id = "";
        }
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    async dispatchEvent(event) {
        event.target ??= this;
        event.currentTarget = this;

        for (const listener of this.listeners.get(event.type) ?? []) {
            await listener(event);
        }

        if (event.bubbles !== false && this.parentElement) {
            await this.parentElement.dispatchEvent(event);
        }

        return true;
    }

    focus(options) {
        if (!this.isConnected || this.disabled || this.focusDisabled) {
            return;
        }

        this.focusCalls.push({
            options,
            renderGeneration: this.ownerDocument.renderGeneration
        });
        this.ownerDocument.activeElement = this;
    }

    matches(selector) {
        if (selector.startsWith("#")) {
            return this.id === selector.slice(1);
        }

        if (selector.startsWith(".")) {
            return this.classList.contains(selector.slice(1));
        }

        const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);

        if (dataMatch) {
            const key = dataMatch[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            return Object.hasOwn(this.dataset, key);
        }

        return selector === "[hidden]" ? this.hidden : false;
    }

    closest(selector) {
        let current = this;

        while (current) {
            if (current.matches(selector)) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    querySelectorAll(selector) {
        const matches = [];

        for (const child of this.children) {
            if (child.matches(selector)) {
                matches.push(child);
            }

            matches.push(...child.querySelectorAll(selector));
        }

        return matches;
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }
}

class FakeDocument {
    constructor() {
        this.renderGeneration = 0;
        this.documentElement = new FakeElement("html", this);
        this.body = new FakeElement("body", this);
        this.documentElement.appendChild(this.body);
        this.activeElement = this.body;
    }

    createElement(tagName) {
        return new FakeElement(tagName, this);
    }

    querySelectorAll(selector) {
        const matches = this.documentElement.matches(selector) ? [this.documentElement] : [];
        return [...matches, ...this.documentElement.querySelectorAll(selector)];
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }
}

class FakeLocalStorage {
    constructor() {
        this.values = new Map();
    }

    getItem(key) {
        return this.values.get(key) ?? null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }
}

const bootstrapDocument = new FakeDocument();
globalThis.Element = FakeElement;
globalThis.document = bootstrapDocument;
globalThis.window = createWindow(bootstrapDocument);

const {
    getFavoriteFocusIndex,
    initFavorites,
    restoreFavoriteFocus
} = await import("../js/components/favorites.js?v=1.4.1-p1c-live-semantics-test");

const TOULOUSE = createLocation("toulouse", "Toulouse", 43.6047, 1.4442);
const PARIS = createLocation("paris", "Paris", 48.8566, 2.3522);
const LYON = createLocation("lyon", "Lyon", 45.764, 4.8357);
const BORDEAUX = createLocation("bordeaux", "Bordeaux", 44.8378, -0.5792);

test("une liste de favoris vide ne porte pas une semantique de liste", () => {
    const harness = createHarness({ favorites: [] });

    [harness.desktopList, harness.mobileList].forEach((list) => {
        assert.equal(list.getAttribute("role"), null);
        assert.equal(list.children.length, 1);
        assert.equal(list.children[0].tagName, "P");
        assert.equal(list.children[0].getAttribute("role"), null);
    });
});

test("le passage de zero a un favori restaure les deux listes et leurs elements", async () => {
    const notifications = [];
    const harness = createHarness({
        favorites: [],
        activeLocation: TOULOUSE,
        onToggle: (payload) => notifications.push(payload)
    });

    await harness.favoriteButton.dispatchEvent({ type: "click", bubbles: true });

    [harness.desktopList, harness.mobileList].forEach((list) => {
        assert.equal(list.getAttribute("role"), "list");
        assert.equal(list.children.length, 1);
        assert.equal(list.children[0].getAttribute("role"), "listitem");
    });
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].isFavorite, true);
});

test("le passage de un a plusieurs favoris conserve les deux listes coherentes", async () => {
    const harness = createHarness({
        favorites: [TOULOUSE],
        activeLocation: PARIS
    });

    await harness.favoriteButton.dispatchEvent({ type: "click", bubbles: true });

    [harness.desktopList, harness.mobileList].forEach((list) => {
        assert.equal(list.getAttribute("role"), "list");
        assert.equal(list.children.length, 2);
        list.children.forEach((item) => assert.equal(item.getAttribute("role"), "listitem"));
    });
});

test("la limite de favoris ne declenche pas une fausse annonce de retrait", async () => {
    const notifications = [];
    const favorites = Array.from({ length: 100 }, (_, index) => (
        createLocation(`city-${index}`, `Ville ${index}`, 40 + index / 1000, 1)
    ));
    const harness = createHarness({
        favorites,
        activeLocation: createLocation("city-100", "Ville 100", 41, 1),
        onToggle: (payload) => notifications.push(payload)
    });

    await harness.favoriteButton.dispatchEvent({ type: "click", bubbles: true });

    assert.equal(notifications.length, 0);
    assert.equal(harness.desktopList.children.length, 100);
    assert.equal(harness.mobileList.children.length, 100);
    assert.equal(harness.favoriteButton.getAttribute("aria-pressed"), "false");
});

test("le passage de plusieurs a un favori conserve une liste valide", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS] });

    await removeAt(harness.desktopList, 1);

    [harness.desktopList, harness.mobileList].forEach((list) => {
        assert.equal(list.getAttribute("role"), "list");
        assert.equal(list.children.length, 1);
        assert.equal(list.children[0].getAttribute("role"), "listitem");
    });
});

test("le passage de un a zero favori retire les deux roles list", async () => {
    const notifications = [];
    const harness = createHarness({
        favorites: [TOULOUSE],
        activeLocation: TOULOUSE,
        onRemove: (payload) => notifications.push(payload)
    });

    await removeAt(harness.desktopList, 0);

    assert.equal(harness.desktopList.getAttribute("role"), null);
    assert.equal(harness.mobileList.getAttribute("role"), null);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].location.id, TOULOUSE.id);
});

test("un favori central transfere le focus au favori suivant sans faire defiler la liste", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS, LYON], activeLocation: TOULOUSE });
    harness.desktopList.scrollTop = 160;

    await removeAt(harness.desktopList, 1);

    assert.equal(document.activeElement.dataset.favoriteKey, LYON.id);
    assert.equal(document.activeElement.closest("[data-favorites-list]"), harness.desktopList);
    assert.deepEqual(document.activeElement.focusCalls.at(-1).options, { preventScroll: true });
    assert.equal(harness.desktopList.scrollTop, 160);
});

test("une longue liste conserve son defilement lors d'une suppression vers le bas", async () => {
    const longFavorites = Array.from({ length: 12 }, (_, index) => (
        createLocation(`ville-${index}`, `Ville ${index}`, 40 + index / 10, 1 + index / 10)
    ));
    const harness = createHarness({ favorites: longFavorites, activeLocation: longFavorites[0] });
    harness.desktopList.scrollTop = 240;

    await removeAt(harness.desktopList, 9);

    assert.equal(document.activeElement.dataset.favoriteKey, longFavorites[10].id);
    assert.equal(document.activeElement.closest("[data-favorites-list]"), harness.desktopList);
    assert.equal(harness.desktopList.scrollTop, 240);
    assert.deepEqual(document.activeElement.focusCalls.at(-1).options, { preventScroll: true });
});

test("le dernier favori transfere le focus au favori precedent", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS, LYON] });

    await removeAt(harness.desktopList, 2);

    assert.equal(document.activeElement.dataset.favoriteKey, PARIS.id);
    assert.equal(getFavoriteFocusIndex(2, 2), 1);
});

test("le premier favori transfere le focus au nouveau premier", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS, LYON] });

    await removeAt(harness.desktopList, 0);

    assert.equal(document.activeElement.dataset.favoriteKey, PARIS.id);
    assert.equal(getFavoriteFocusIndex(0, 2), 0);
});

test("le favori unique transfere le focus au bouton global", async () => {
    const harness = createHarness({ favorites: [TOULOUSE], activeLocation: TOULOUSE });

    await removeAt(harness.mobileList, 0);

    assert.equal(document.activeElement, harness.favoriteButton);
    assert.deepEqual(harness.favoriteButton.focusCalls.at(-1).options, { preventScroll: true });
});

test("plusieurs suppressions successives conservent une progression logique", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS, LYON, BORDEAUX] });

    await removeAt(harness.desktopList, 1);
    assert.equal(document.activeElement.dataset.favoriteKey, LYON.id);
    await activateFocusedRemove();
    assert.equal(document.activeElement.dataset.favoriteKey, BORDEAUX.id);
    await activateFocusedRemove();
    assert.equal(document.activeElement.dataset.favoriteKey, TOULOUSE.id);
    assert.notEqual(document.activeElement, document.body);
});

test("deux listes sont reconstruites mais seule la representation source recoit le focus", async () => {
    const harness = createHarness({
        favorites: [TOULOUSE, PARIS, LYON],
        desktopDisplay: "none",
        mobileDisplay: "block"
    });

    await removeAt(harness.mobileList, 1);

    assert.equal(document.activeElement.dataset.favoriteKey, LYON.id);
    assert.equal(document.activeElement.closest("[data-favorites-list]"), harness.mobileList);
    assert.equal(harness.desktopList.contains(document.activeElement), false);
    assert.equal(harness.desktopList.querySelectorAll("[data-favorite-remove]").length, 2);
});

test("la suppression de la ville active conserve le message et le comportement metier existants", async () => {
    let payload;
    let message = "";
    const harness = createHarness({
        favorites: [TOULOUSE, PARIS],
        activeLocation: TOULOUSE,
        onRemove(value) {
            payload = value;
            const suffix = value.removedActiveLocation ? " La ville affichée reste active." : "";
            message = `${value.location.name} supprimée des villes enregistrées.${suffix}`;
        }
    });

    await removeAt(harness.desktopList, 0);

    assert.equal(payload.location.id, TOULOUSE.id);
    assert.equal(payload.removedActiveLocation, true);
    assert.equal(message, "Toulouse supprimée des villes enregistrées. La ville affichée reste active.");

    const appSource = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
    assert.match(appSource, /\$\{location\.name\} supprimée des villes enregistrées\.\$\{suffix\}/);
});

test("la suppression d'une ville non active conserve l'indicateur metier", async () => {
    let payload;
    const harness = createHarness({
        favorites: [TOULOUSE, PARIS],
        activeLocation: TOULOUSE,
        onRemove(value) {
            payload = value;
        }
    });

    await removeAt(harness.desktopList, 1);

    assert.equal(payload.location.id, PARIS.id);
    assert.equal(payload.removedActiveLocation, false);
});

test("l'absence du bouton global ne provoque aucune exception", async () => {
    const harness = createHarness({ favorites: [TOULOUSE], includeFavoriteButton: false });

    await assert.doesNotReject(removeAt(harness.desktopList, 0));
    assert.equal(document.activeElement, document.body);
});

test("le focus cible un controle du nouveau rendu et jamais le bouton detruit", async () => {
    const harness = createHarness({ favorites: [TOULOUSE, PARIS, LYON] });
    const oldButton = harness.desktopList.querySelectorAll("[data-favorite-remove]")[1];
    const generationBeforeRemoval = document.renderGeneration;

    await removeAt(harness.desktopList, 1);

    assert.notEqual(document.activeElement, oldButton);
    assert.ok(document.activeElement.focusCalls.at(-1).renderGeneration > generationBeforeRemoval);
    assert.equal(oldButton.isConnected, false);
});

test("le nouveau controle conserve aria-label, aria-pressed et data-favorite-key", async () => {
    const harness = createHarness({
        favorites: [TOULOUSE, PARIS, LYON],
        activeLocation: LYON
    });

    await removeAt(harness.desktopList, 1);

    const removeButton = document.activeElement;
    const selectButton = removeButton.parentElement.querySelector("[data-favorite-select]");
    assert.equal(removeButton.getAttribute("aria-label"), "Supprimer Lyon des villes enregistrées");
    assert.equal(removeButton.dataset.favoriteKey, LYON.id);
    assert.equal(selectButton.dataset.favoriteKey, LYON.id);
    assert.equal(selectButton.getAttribute("aria-pressed"), "true");
});

test("une cible masquee, desactivee ou deconnectee n'est jamais focalisee", () => {
    const hiddenHarness = createHarness({ favorites: [TOULOUSE, PARIS] });
    hiddenHarness.desktopPanel.style.visibility = "hidden";
    const hiddenResult = restoreFavoriteFocus({
        sourceList: hiddenHarness.desktopList,
        removedIndex: 0,
        remainingCount: 2
    });
    assert.equal(hiddenResult, hiddenHarness.favoriteButton);

    const disabledHarness = createHarness({ favorites: [TOULOUSE, PARIS] });
    disabledHarness.desktopList.querySelectorAll("[data-favorite-remove]")[0].disabled = true;
    const disabledResult = restoreFavoriteFocus({
        sourceList: disabledHarness.desktopList,
        removedIndex: 0,
        remainingCount: 2
    });
    assert.equal(disabledResult, disabledHarness.favoriteButton);

    const disconnectedHarness = createHarness({
        favorites: [TOULOUSE, PARIS],
        includeFavoriteButton: false
    });
    disconnectedHarness.desktopList.forceDisconnected = true;
    assert.doesNotThrow(() => restoreFavoriteFocus({
        sourceList: disconnectedHarness.desktopList,
        removedIndex: 0,
        remainingCount: 2
    }));
    assert.equal(document.activeElement, document.body);
});

test("la revision JavaScript invalide toute la chaine menant au composant", () => {
    const indexSource = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const appSource = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");

    assert.match(indexSource, /js\/app\.js\?v=1\.4\.1-p1d-api-cache-privacy/);
    assert.match(appSource, /components\/favorites\.js\?v=1\.4\.1-p1d-storage-validation/);
    assert.match(appSource, /core\/storage\.js\?v=1\.4\.1-p1d-storage-validation/);
    assert.doesNotMatch(indexSource, /css\/[^"']+\?v=1\.4\.1-p1c-live-semantics/);
});

function createHarness({
    favorites,
    activeLocation = TOULOUSE,
    includeFavoriteButton = true,
    desktopDisplay = "block",
    mobileDisplay = "block",
    onRemove = () => {},
    onToggle = () => {}
}) {
    const fakeDocument = new FakeDocument();
    const fakeWindow = createWindow(fakeDocument);
    globalThis.document = fakeDocument;
    globalThis.window = fakeWindow;

    fakeWindow.localStorage.setItem("meteosignal.favorites", JSON.stringify(favorites));

    const favoriteButton = includeFavoriteButton
        ? appendElement(fakeDocument.body, "button", { id: "favorite-button" })
        : null;
    const desktopPanel = appendElement(fakeDocument.body, "section", { className: "desktop-panel" });
    const desktopCount = appendElement(desktopPanel, "span", { dataset: { favoritesCount: "" } });
    const desktopList = appendElement(desktopPanel, "div", { dataset: { favoritesList: "" } });
    const mobilePanel = appendElement(fakeDocument.body, "section", { className: "mobile-panel" });
    const mobileCount = appendElement(mobilePanel, "span", { dataset: { favoritesCount: "" } });
    const mobileList = appendElement(mobilePanel, "div", { dataset: { favoritesList: "" } });
    desktopPanel.style.display = desktopDisplay;
    mobilePanel.style.display = mobileDisplay;

    initFavorites({
        getActiveLocation: () => activeLocation,
        onRemove,
        onToggle
    });

    return {
        desktopCount,
        desktopList,
        desktopPanel,
        favoriteButton,
        mobileCount,
        mobileList,
        mobilePanel
    };
}

function createWindow(fakeDocument) {
    return {
        localStorage: new FakeLocalStorage(),
        getComputedStyle(element) {
            return {
                display: element.style.display ?? "block",
                visibility: element.style.visibility ?? "visible"
            };
        },
        document: fakeDocument
    };
}

function appendElement(parent, tagName, { id, className, dataset } = {}) {
    const element = parent.ownerDocument.createElement(tagName);

    if (id) {
        element.setAttribute("id", id);
    }

    if (className) {
        element.className = className;
    }

    Object.assign(element.dataset, dataset);
    parent.appendChild(element);
    return element;
}

function createLocation(id, name, latitude, longitude) {
    return {
        id,
        name,
        label: `${name}, France`,
        country: "France",
        latitude,
        longitude,
        timezone: "Europe/Paris",
        source: "test"
    };
}

async function removeAt(list, index) {
    const button = list.querySelectorAll("[data-favorite-remove]")[index];
    button.focus();
    await button.dispatchEvent({ type: "click", bubbles: true, target: button });
}

async function activateFocusedRemove() {
    const button = document.activeElement;
    await button.dispatchEvent({ type: "click", bubbles: true, target: button });
}
