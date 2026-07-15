import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    FAVORITES_DESKTOP_MEDIA_QUERY,
    initNavigation,
    moveCanonicalFavoritesPanel,
    setFavoritesPanelExpanded
} from "../js/components/navigation.js?v=1.5.0-navigation-test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const FAVORITES_SOURCE = read("js/components/favorites.js");
const NAVIGATION_SOURCE = read("js/components/navigation.js");
const RESPONSIVE_SOURCE = read("css/responsive.css");
const STORAGE_SOURCE = read("js/core/storage.js");

test("un seul panneau, une seule liste et un seul compteur existent dans le DOM", () => {
    assert.equal(count(INDEX_SOURCE, "data-favorites-panel"), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-list"), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-count"), 1);
    assert.equal(count(INDEX_SOURCE, 'data-favorites-host="desktop"'), 1);
    assert.equal(count(INDEX_SOURCE, 'data-favorites-host="compact"'), 1);
    assert.doesNotMatch(INDEX_SOURCE, /favorites-panel--(?:sidebar|inline)/);
});

test("le disclosure est nomme, controle un contenu unique et le masque initialement", () => {
    const toggle = tagWithAttribute(INDEX_SOURCE, "data-favorites-toggle");
    const content = tagWithAttribute(INDEX_SOURCE, "data-favorites-content");

    assert.match(toggle, /type="button"/);
    assert.match(toggle, /aria-label="Villes enregistrées, aucune ville"/);
    assert.match(toggle, /aria-expanded="false"/);
    assert.match(toggle, /aria-controls="saved-cities-content"/);
    assert.match(content, /id="saved-cities-content"/);
    assert.match(content, /hidden/);
    assert.match(INDEX_SOURCE, /aria-labelledby="saved-cities-title"/);
});

test("le meme panneau se deplace entre les deux hotes sans perdre son contenu", () => {
    const document = { activeElement: null };
    const compactHost = new FakeNode(document);
    const desktopHost = new FakeNode(document);
    const panel = new FakeNode(document);
    const list = new FakeNode(document);
    const listenerToken = Symbol("listener");
    panel.listenerToken = listenerToken;
    panel.append(list);
    compactHost.append(panel);

    assert.equal(moveCanonicalFavoritesPanel(panel, desktopHost, "desktop"), true);
    assert.equal(desktopHost.children[0], panel);
    assert.equal(panel.children[0], list);
    assert.equal(panel.listenerToken, listenerToken);
    assert.equal(panel.dataset.favoritesPlacement, "desktop");
    assert.equal(compactHost.children.length, 0);

    assert.equal(moveCanonicalFavoritesPanel(panel, compactHost, "compact"), true);
    assert.equal(compactHost.children[0], panel);
    assert.equal(panel.dataset.favoritesPlacement, "compact");
    assert.equal(moveCanonicalFavoritesPanel(panel, compactHost, "compact"), false);
});

test("le disclosure ouvre, ferme et restaure le focus sans exposer le contenu ferme", () => {
    const document = { activeElement: null };
    const toggle = new FakeNode(document);
    const content = new FakeNode(document);
    const favoriteControl = new FakeNode(document);
    content.append(favoriteControl);

    setFavoritesPanelExpanded(toggle, content, true);
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.equal(content.hidden, false);

    document.activeElement = favoriteControl;
    setFavoritesPanelExpanded(toggle, content, false, { restoreFocus: true });
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(content.hidden, true);
    assert.equal(document.activeElement, toggle);
    assert.deepEqual(toggle.focusOptions, { preventScroll: true });
});

test("le controle responsive utilise le breakpoint CSS officiel sans cloner le panneau", () => {
    assert.equal(FAVORITES_DESKTOP_MEDIA_QUERY, "(min-width: 1180px)");
    assert.match(NAVIGATION_SOURCE, /window\.matchMedia\(FAVORITES_DESKTOP_MEDIA_QUERY\)/);
    assert.match(NAVIGATION_SOURCE, /host\.append\(panel\)/);
    assert.doesNotMatch(NAVIGATION_SOURCE, /cloneNode|innerHTML/);
});

test("la sidebar repliee conserve le titre des favoris dans l'arbre accessible", () => {
    assert.match(
        RESPONSIVE_SOURCE,
        /body\[data-nav-collapsed="true"\] \.favorites-heading\s*\{[^}]*position:\s*absolute;[^}]*clip:\s*rect\(0, 0, 0, 0\);/s
    );
    assert.doesNotMatch(
        RESPONSIVE_SOURCE,
        /body\[data-nav-collapsed="true"\] \.favorites-heading[^{}]*\{[^}]*display:\s*none;/s
    );
});

test("la navigation reste idempotente et synchronise sidebar, disclosure et focus", async () => {
    const harness = createNavigationHarness();
    globalThis.document = harness.document;
    globalThis.window = harness.window;

    assert.equal(initNavigation(), true);
    assert.equal(initNavigation(), false);
    assert.equal(harness.collapseButton.listenerCount("click"), 1);
    assert.equal(harness.toggleButton.listenerCount("click"), 1);
    assert.equal(harness.media.listenerCount("change"), 1);
    assert.equal(harness.document.listenerCount("keydown"), 1);

    harness.toggleButton.focus({ preventScroll: true });
    await harness.collapseButton.dispatchEvent({ type: "click" });

    assert.equal(harness.document.body.dataset.navCollapsed, "true");
    assert.equal(harness.toggleButton.getAttribute("aria-expanded"), "false");
    assert.equal(harness.content.hidden, true);
    assert.equal(isEffectivelyHidden(harness.favoriteControl), true);

    await harness.toggleButton.dispatchEvent({ type: "click" });

    assert.equal(harness.document.body.dataset.navCollapsed, "false");
    assert.equal(harness.toggleButton.getAttribute("aria-expanded"), "true");
    assert.equal(harness.content.hidden, false);
    assert.equal(harness.document.activeElement, harness.toggleButton);
    assert.equal(harness.panel.parentElement, harness.desktopHost);

    await harness.collapseButton.dispatchEvent({ type: "click" });

    assert.equal(harness.document.body.dataset.navCollapsed, "true");
    assert.equal(harness.toggleButton.getAttribute("aria-expanded"), "false");
    assert.equal(harness.content.hidden, true);
    assert.equal(isEffectivelyHidden(harness.favoriteControl), true);

    await harness.collapseButton.dispatchEvent({ type: "click" });

    assert.equal(harness.document.body.dataset.navCollapsed, "false");
    assert.equal(harness.toggleButton.getAttribute("aria-expanded"), "false");
    assert.equal(harness.content.hidden, true);

    harness.media.emit(false);
    assert.equal(harness.panel.parentElement, harness.compactHost);
    harness.media.emit(true);
    assert.equal(harness.panel.parentElement, harness.desktopHost);
    assert.equal(harness.media.listenerCount("change"), 1);
});

test("la bottom navigation conserve exactement ses cinq entrees", () => {
    assert.equal((INDEX_SOURCE.match(/class="mobile-bottom-link(?: [^"]*)?"/g) ?? []).length, 5);
});

test("le rendu des favoris cible une seule liste et conserve le stockage historique", () => {
    assert.match(FAVORITES_SOURCE, /document\.querySelector\(FAVORITES_LIST_SELECTOR\)/);
    assert.doesNotMatch(FAVORITES_SOURCE, /querySelectorAll\(FAVORITES_LIST_SELECTOR\)/);
    assert.match(STORAGE_SOURCE, /activeLocation:\s*"meteosignal\.activeLocation"/);
    assert.match(STORAGE_SOURCE, /favorites:\s*"meteosignal\.favorites"/);
    assert.equal(count(STORAGE_SOURCE, "meteosignal.activeLocation"), 1);
    assert.equal(count(STORAGE_SOURCE, "meteosignal.favorites"), 1);
});

test("la version publique reste 1.4.2", () => {
    const packageJson = JSON.parse(read("package.json"));
    const configSource = read("config/config.js");

    assert.equal(packageJson.version, "1.4.2");
    assert.match(configSource, /version:\s*"1\.4\.2"/);
});

class FakeNode {
    constructor(ownerDocument) {
        this.ownerDocument = ownerDocument;
        this.parentElement = null;
        this.children = [];
        this.dataset = {};
        this.attributes = new Map();
        this.hidden = false;
        this.isConnected = true;
        this.listeners = new Map();
        this.selectorMap = new Map();
    }

    append(child) {
        if (child.parentElement) {
            child.parentElement.children = child.parentElement.children.filter((item) => item !== child);
        }

        child.parentElement = this;
        this.children.push(child);
    }

    contains(node) {
        return this === node || this.children.some((child) => child.contains(node));
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    async dispatchEvent(event) {
        for (const listener of this.listeners.get(event.type) ?? []) {
            await listener({ ...event, currentTarget: this, target: this });
        }
    }

    listenerCount(type) {
        return this.listeners.get(type)?.length ?? 0;
    }

    querySelector(selector) {
        return this.selectorMap.get(selector) ?? null;
    }

    focus(options) {
        this.focusOptions = options;
        this.ownerDocument.activeElement = this;
    }
}

class FakeNavigationDocument {
    constructor() {
        this.activeElement = null;
        this.listeners = new Map();
        this.selectorMap = new Map();
        this.selectorLists = new Map();
        this.body = new FakeNode(this);
        this.activeElement = this.body;
    }

    querySelector(selector) {
        return this.selectorMap.get(selector) ?? null;
    }

    querySelectorAll(selector) {
        return this.selectorLists.get(selector) ?? [];
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? [];
        listeners.push(listener);
        this.listeners.set(type, listeners);
    }

    listenerCount(type) {
        return this.listeners.get(type)?.length ?? 0;
    }
}

class FakeMediaQuery {
    constructor(matches) {
        this.matches = matches;
        this.listeners = [];
    }

    addEventListener(type, listener) {
        if (type === "change") {
            this.listeners.push(listener);
        }
    }

    listenerCount(type) {
        return type === "change" ? this.listeners.length : 0;
    }

    emit(matches) {
        this.matches = matches;
        this.listeners.forEach((listener) => listener({ matches }));
    }
}

function createNavigationHarness() {
    const document = new FakeNavigationDocument();
    const media = new FakeMediaQuery(true);
    const desktopHost = new FakeNode(document);
    const compactHost = new FakeNode(document);
    const panel = new FakeNode(document);
    const toggleButton = new FakeNode(document);
    const content = new FakeNode(document);
    const favoriteControl = new FakeNode(document);
    const collapseButton = new FakeNode(document);
    const window = {
        innerHeight: 800,
        location: { hash: "" },
        matchMedia: () => media,
        addEventListener() {},
        requestAnimationFrame(callback) {
            callback();
            return 1;
        },
        setTimeout(callback) {
            callback();
            return 1;
        }
    };

    toggleButton.setAttribute("aria-expanded", "false");
    content.hidden = true;
    content.append(favoriteControl);
    panel.append(toggleButton);
    panel.append(content);
    compactHost.append(panel);

    document.selectorMap.set("[data-nav-collapse]", collapseButton);
    document.selectorMap.set("[data-favorites-panel]", panel);
    document.selectorMap.set('[data-favorites-host="desktop"]', desktopHost);
    document.selectorMap.set('[data-favorites-host="compact"]', compactHost);
    document.selectorMap.set("[data-favorites-toggle]", toggleButton);
    document.selectorMap.set("[data-favorites-content]", content);
    document.selectorLists.set("[data-nav-link]", []);
    document.selectorLists.set("[data-mobile-nav-link]", []);

    return {
        collapseButton,
        compactHost,
        content,
        desktopHost,
        document,
        favoriteControl,
        media,
        panel,
        toggleButton,
        window
    };
}

function isEffectivelyHidden(element) {
    let current = element;

    while (current) {
        if (current.hidden) {
            return true;
        }

        current = current.parentElement;
    }

    return false;
}

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function count(source, value) {
    return source.split(value).length - 1;
}

function tagWithAttribute(source, attribute) {
    return source.match(new RegExp(`<[^>]+${attribute}(?:="[^"]*")?[^>]*>`))?.[0] ?? "";
}
