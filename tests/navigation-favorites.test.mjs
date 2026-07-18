import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    initNavigation,
    setFavoritesPanelExpanded
} from "../js/components/navigation.js?v=1.5.2-quick-access-test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const COMPONENTS_SOURCE = read("css/components.css");
const RESPONSIVE_SOURCE = read("css/responsive.css");
const FAVORITES_SOURCE = read("js/components/favorites.js");
const NAVIGATION_SOURCE = read("js/components/navigation.js");
const STORAGE_SOURCE = read("js/core/storage.js");

test("un seul panneau canonique, une seule liste et un seul compteur existent", () => {
    assert.equal(count(INDEX_SOURCE, "data-favorites-panel"), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-list"), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-count"), 1);
    assert.equal(count(INDEX_SOURCE, 'data-favorites-host="header"'), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-toggle"), 1);
    assert.equal(count(INDEX_SOURCE, "data-favorites-close"), 1);
    assert.doesNotMatch(INDEX_SOURCE, /data-favorites-host="(?:desktop|compact)"/);
    assert.doesNotMatch(INDEX_SOURCE, /favorites-panel--(?:sidebar|inline)/);
});

test("le bouton Acces rapide controle le panneau masque sans remplacer la recherche", () => {
    const toggle = tagWithAttribute(INDEX_SOURCE, "data-favorites-toggle");
    const panel = tagWithAttribute(INDEX_SOURCE, "data-favorites-panel");

    assert.match(toggle, /id="quick-access-button"/);
    assert.match(toggle, /type="button"/);
    assert.match(toggle, /aria-label="Accès rapide, aucune ville enregistrée"/);
    assert.match(toggle, /aria-expanded="false"/);
    assert.match(toggle, /aria-controls="saved-cities-panel"/);
    assert.match(panel, /id="saved-cities-panel"/);
    assert.match(panel, /role="region"/);
    assert.match(panel, /aria-labelledby="saved-cities-title"/);
    assert.match(panel, /hidden/);
    assert.equal(count(INDEX_SOURCE, 'class="search-panel"'), 1);
    assert.equal(count(INDEX_SOURCE, 'id="city-search"'), 1);
});

test("le panneau s ouvre, se ferme et restaure le focus sur demande", () => {
    const document = { activeElement: null };
    const toggle = new FakeNode(document);
    const panel = new FakeNode(document);
    const favoriteControl = new FakeNode(document);

    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
    panel.append(favoriteControl);

    setFavoritesPanelExpanded(toggle, panel, true);
    assert.equal(toggle.getAttribute("aria-expanded"), "true");
    assert.equal(panel.hidden, false);

    favoriteControl.focus();
    setFavoritesPanelExpanded(toggle, panel, false, { restoreFocus: true });
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(panel.hidden, true);
    assert.equal(document.activeElement, toggle);
    assert.deepEqual(toggle.focusOptions, { preventScroll: true });
});

test("la navigation est idempotente et gere tous les modes de fermeture", async () => {
    const harness = createNavigationHarness();
    globalThis.document = harness.document;
    globalThis.window = harness.window;

    assert.equal(initNavigation(), true);
    assert.equal(initNavigation(), false);
    assert.equal(harness.toggleButton.listenerCount("click"), 1);
    assert.equal(harness.closeButton.listenerCount("click"), 1);
    assert.equal(harness.panel.listenerCount("click"), 1);
    assert.equal(harness.document.listenerCount("pointerdown"), 1);
    assert.equal(harness.document.listenerCount("keydown"), 1);

    await harness.toggleButton.dispatchEvent({ type: "click" });
    assert.equal(harness.toggleButton.getAttribute("aria-expanded"), "true");
    assert.equal(harness.panel.hidden, false);

    await harness.panel.dispatchEvent({
        type: "click",
        target: createClosestTarget("[data-favorite-remove]")
    });
    assert.equal(harness.panel.hidden, false, "supprimer ne ferme pas le panneau");

    await harness.panel.dispatchEvent({
        type: "click",
        target: createClosestTarget("[data-favorite-select]")
    });
    assert.equal(harness.panel.hidden, true, "selectionner ferme le panneau");
    assert.equal(harness.document.activeElement, harness.toggleButton);

    await harness.toggleButton.dispatchEvent({ type: "click" });
    await harness.document.dispatchEvent({ type: "pointerdown", target: harness.outside });
    assert.equal(harness.panel.hidden, true, "un clic exterieur ferme le panneau");

    await harness.toggleButton.dispatchEvent({ type: "click" });
    await harness.closeButton.dispatchEvent({ type: "click" });
    assert.equal(harness.panel.hidden, true, "le bouton Fermer ferme le panneau");
    assert.equal(harness.document.activeElement, harness.toggleButton);

    await harness.toggleButton.dispatchEvent({ type: "click" });
    await harness.document.dispatchEvent({ type: "keydown", key: "Escape", target: harness.panel });
    assert.equal(harness.panel.hidden, true, "Echap ferme le panneau");
    assert.equal(harness.document.activeElement, harness.toggleButton);
});

test("le repli de la sidebar ferme le panneau sans deplacer son DOM", async () => {
    const harness = createNavigationHarness();
    globalThis.document = harness.document;
    globalThis.window = harness.window;

    assert.equal(initNavigation(), true);
    await harness.toggleButton.dispatchEvent({ type: "click" });
    await harness.collapseButton.dispatchEvent({ type: "click" });

    assert.equal(harness.document.body.dataset.navCollapsed, "true");
    assert.equal(harness.panel.hidden, true);
    assert.equal(harness.document.activeElement, harness.toggleButton);
    assert.doesNotMatch(NAVIGATION_SOURCE, /matchMedia|append\(panel\)|cloneNode/);
});

test("le panneau flotte sous le header sans pousser le hero", () => {
    assert.match(COMPONENTS_SOURCE, /\.favorites-host--header\s*\{[^}]*position:\s*absolute;[^}]*top:\s*100%;[^}]*right:\s*0;[^}]*left:\s*0;/s);
    assert.match(COMPONENTS_SOURCE, /\.favorites-panel\s*\{[^}]*position:\s*absolute;/s);
    assert.match(COMPONENTS_SOURCE, /\.favorites-panel\s*\{[^}]*top:\s*var\(--space-2\);/s);
    assert.match(COMPONENTS_SOURCE, /\.favorites-panel\s*\{[^}]*width:\s*min\(42rem, 100%\);/s);
    assert.match(COMPONENTS_SOURCE, /\.favorites-panel\s*\{[^}]*max-height:\s*min\(22rem,/s);
    assert.match(COMPONENTS_SOURCE, /\.favorites-panel\[hidden\]\s*\{[^}]*display:\s*none;/s);
    assert.match(RESPONSIVE_SOURCE, /max-height:\s*min\(20rem,/);
    assert.match(RESPONSIVE_SOURCE, /max-height:\s*min\(18rem,/);
    assert.match(RESPONSIVE_SOURCE, /\.favorites-panel\s*\{[^}]*inset-inline:\s*0;[^}]*width:\s*auto;/s);
});

test("la liste conserve une seule rangee horizontale defilable", () => {
    const favoritesListRule = COMPONENTS_SOURCE.match(/\.favorites-list\s*\{[^}]*\}/s)?.[0] ?? "";
    const favoriteItemRule = COMPONENTS_SOURCE.match(/\.favorite-item\s*\{[^}]*\}/s)?.[0] ?? "";

    assert.match(favoritesListRule, /display:\s*flex;/);
    assert.match(favoritesListRule, /flex-wrap:\s*nowrap;/);
    assert.match(favoritesListRule, /overflow-x:\s*auto;/);
    assert.match(favoritesListRule, /overflow-y:\s*hidden;/);
    assert.match(favoriteItemRule, /min-width:\s*min\(18rem, 70vw\);/);
    assert.match(favoriteItemRule, /flex:\s*0 0 auto;/);
    assert.match(RESPONSIVE_SOURCE, /scroll-snap-type:\s*x proximity;/);
});

test("le bouton ouvert reste bleu cyan et le verre du panneau reste inchange", () => {
    const openButtonRule = COMPONENTS_SOURCE.match(/\.header-actions #quick-access-button\[aria-expanded="true"\][^{]*\{[^}]*\}/s)?.[0] ?? "";
    const openFocusRule = COMPONENTS_SOURCE.match(/\.header-actions #quick-access-button\[aria-expanded="true"\]:focus-visible\s*\{[^}]*\}/s)?.[0] ?? "";
    const openIconRule = COMPONENTS_SOURCE.match(/\.header-actions #quick-access-button\[aria-expanded="true"\] \.quick-access-icon\s*\{[^}]*\}/s)?.[0] ?? "";
    const panelRule = COMPONENTS_SOURCE.match(/\.favorites-panel\s*\{[^}]*\}/s)?.[0] ?? "";

    assert.match(openButtonRule, /:hover,/);
    assert.match(openButtonRule, /:focus-visible,/);
    assert.match(openButtonRule, /:active\s*\{/);
    assert.match(openButtonRule, /-webkit-appearance:\s*none;/);
    assert.match(openButtonRule, /appearance:\s*none;/);
    assert.match(openButtonRule, /border-color:\s*var\(--color-border-strong\);/);
    assert.match(openButtonRule, /background:[^}]*rgba\(18, 109, 255,/s);
    assert.match(openButtonRule, /background:[^}]*var\(--color-night-850\);/s);
    assert.match(openButtonRule, /color:\s*var\(--color-white\);/);
    assert.match(openButtonRule, /box-shadow:\s*var\(--shadow-cyan\);/);
    assert.match(openButtonRule, /filter:\s*none;/);
    assert.match(openButtonRule, /opacity:\s*1;/);
    assert.match(openFocusRule, /outline:\s*3px solid var\(--color-cyan-300\);/);
    assert.match(openFocusRule, /box-shadow:\s*var\(--shadow-focus\), var\(--shadow-cyan\);/);
    assert.match(openIconRule, /color:\s*var\(--color-cyan-300\);/);
    assert.match(panelRule, /rgba\(4, 33, 76, 0\.68\);/);
    assert.match(panelRule, /-webkit-backdrop-filter:\s*blur\(18px\);/);
    assert.match(panelRule, /backdrop-filter:\s*blur\(18px\);/);
});

test("la bottom navigation conserve exactement ses cinq entrees", () => {
    assert.equal((INDEX_SOURCE.match(/class="mobile-bottom-link(?: [^"]*)?"/g) ?? []).length, 5);
});

test("le header place la recherche entre le logo et les actions", () => {
    const header = INDEX_SOURCE.match(/<header class="site-header"[\s\S]*?<\/header>/)?.[0] ?? "";
    const brandIndex = header.indexOf("brand-lockup-header");
    const searchIndex = header.indexOf('class="search-panel"');
    const actionsIndex = header.indexOf('class="header-actions"');

    assert.ok(brandIndex >= 0);
    assert.ok(searchIndex > brandIndex);
    assert.ok(actionsIndex > searchIndex);
});

test("la navigation basse couvre mobile et tablette jusqu au breakpoint desktop", () => {
    assert.match(
        RESPONSIVE_SOURCE,
        /@media \(max-width: 1179px\) \{[\s\S]*?\.mobile-bottom-nav\s*\{[\s\S]*?display:\s*grid;/
    );
    assert.match(
        RESPONSIVE_SOURCE,
        /@media \(min-width: 721px\) and \(max-width: 1179px\) \{[\s\S]*?\.adaptive-nav\s*\{\s*display:\s*none;/
    );
    assert.match(RESPONSIVE_SOURCE, /@media \(min-width: 1180px\)/);
    assert.match(
        RESPONSIVE_SOURCE,
        /@media \(max-width: 720px\) \{[\s\S]*?\.dashboard\s*\{[^}]*padding-top:\s*var\(--space-4\);/
    );
});

test("le rendu cible une seule liste et conserve le stockage historique", () => {
    assert.match(FAVORITES_SOURCE, /document\.querySelector\(FAVORITES_LIST_SELECTOR\)/);
    assert.doesNotMatch(FAVORITES_SOURCE, /querySelectorAll\(FAVORITES_LIST_SELECTOR\)/);
    assert.match(STORAGE_SOURCE, /activeLocation:\s*"meteosignal\.activeLocation"/);
    assert.match(STORAGE_SOURCE, /favorites:\s*"meteosignal\.favorites"/);
    assert.equal(count(STORAGE_SOURCE, "meteosignal.activeLocation"), 1);
    assert.equal(count(STORAGE_SOURCE, "meteosignal.favorites"), 1);
});

test("la version publique est 1.5.2", () => {
    const packageJson = JSON.parse(read("package.json"));
    const configSource = read("config/config.js");

    assert.equal(packageJson.version, "1.5.2");
    assert.match(configSource, /version:\s*"1\.5\.2"/);
});

class FakeNode {
    constructor(ownerDocument) {
        this.ownerDocument = ownerDocument;
        this.parentElement = null;
        this.children = [];
        this.dataset = {};
        this.attributes = new Map();
        this.hidden = false;
        this.listeners = new Map();
        this.selectorMap = new Map();
    }

    append(child) {
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
            await listener({ ...event, currentTarget: this, target: event.target ?? this });
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

    async dispatchEvent(event) {
        for (const listener of this.listeners.get(event.type) ?? []) {
            await listener(event);
        }
    }

    listenerCount(type) {
        return this.listeners.get(type)?.length ?? 0;
    }
}

function createNavigationHarness() {
    const document = new FakeNavigationDocument();
    const panel = new FakeNode(document);
    const toggleButton = new FakeNode(document);
    const closeButton = new FakeNode(document);
    const collapseButton = new FakeNode(document);
    const outside = new FakeNode(document);
    const window = {
        innerHeight: 800,
        location: { hash: "" },
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
    panel.hidden = true;

    document.selectorMap.set("[data-nav-collapse]", collapseButton);
    document.selectorMap.set("[data-favorites-panel]", panel);
    document.selectorMap.set("[data-favorites-toggle]", toggleButton);
    document.selectorMap.set("[data-favorites-close]", closeButton);
    document.selectorLists.set("[data-nav-link]", []);
    document.selectorLists.set("[data-mobile-nav-link]", []);

    return {
        closeButton,
        collapseButton,
        document,
        outside,
        panel,
        toggleButton,
        window
    };
}

function createClosestTarget(matchingSelector) {
    return {
        closest(selector) {
            return selector === matchingSelector ? this : null;
        }
    };
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
