import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const PRIVACY_SOURCE = read("confidentialite.html");
const COMPONENTS_SOURCE = read("css/components.css");
const RESPONSIVE_SOURCE = read("css/responsive.css");
const FAVORITES_SOURCE = read("js/components/favorites.js");
const INDEX_DOCUMENT = parseHtml(INDEX_SOURCE);
const PRIVACY_DOCUMENT = parseHtml(PRIVACY_SOURCE);
const PRIVACY_HEADING_IDS = [
    "responsable",
    "donnees",
    "geolocalisation",
    "recherche",
    "stockage",
    "services",
    "finalites",
    "conservation",
    "securite",
    "droits",
    "publicite",
    "evolution"
];
const EXPECTED_VISIBLE_HASHES = {
    index: "f3901ae9f7c0648f43007af1817e5b948c6359ab89c0caf22db465dad7808fa7",
    privacy: "b9b661fdd6ba52b54a4972768744eefeef4cdf1c7683e9e5a4fb07c4001f9b86"
};

test("index.html contient un seul H1", () => {
    assert.equal(elementsByTag(INDEX_DOCUMENT, "h1").length, 1);
});

test("le premier heading de l'accueil est le H1 de la ville", () => {
    const headings = headingElements(INDEX_DOCUMENT);

    assert.equal(headings[0].tagName, "h1");
    assert.equal(headings[0].attributes.id, "current-weather-title");
});

test("aucun H2 ou H3 ne precede le H1 de l'accueil", () => {
    const headings = headingElements(INDEX_DOCUMENT);
    const h1Index = headings.findIndex((element) => element.tagName === "h1");

    assert.equal(h1Index, 0);
    assert.equal(headings.slice(0, h1Index).some((element) => ["h2", "h3"].includes(element.tagName)), false);
});

test("le titre visuel canonique des favoris n'est pas un heading", () => {
    const title = elementById(INDEX_DOCUMENT, "saved-cities-title");

    assert.equal(title.tagName, "span");
    assert.equal(hasClass(title, "favorites-title"), true);
    assert.equal(title.attributes.role, undefined);
    assert.equal(title.attributes["aria-level"], undefined);
});

test("le panneau canonique conserve le nom accessible Acces rapide", () => {
    const panels = elementsWithAttribute(INDEX_DOCUMENT, "data-favorites-panel");

    assert.equal(panels.length, 1);
    const label = elementById(INDEX_DOCUMENT, panels[0].attributes["aria-labelledby"]);
    assert.equal(panels[0].tagName, "div");
    assert.equal(panels[0].attributes.role, "region");
    assert.equal(normalizeText(textContent(label)), "Accès rapide");
});

test("header-actions n'est plus un element nav", () => {
    const actions = elementByClass(INDEX_DOCUMENT, "header-actions");

    assert.equal(actions.tagName, "div");
    assert.equal(elementsByTag(actions, "a").length, 0);
});

test("header-actions est un groupe nomme contenant les trois actions attendues", () => {
    const actions = elementByClass(INDEX_DOCUMENT, "header-actions");
    const buttons = elementsByTag(actions, "button");

    assert.equal(actions.attributes.role, "group");
    assert.equal(actions.attributes["aria-label"], "Actions principales");
    assert.deepEqual(buttons.map((button) => button.attributes.id), [
        "quick-access-button",
        "geolocation-button",
        "favorite-button"
    ]);
    assert.equal(buttons[0].attributes["aria-controls"], "saved-cities-panel");
    assert.equal(buttons[0].attributes["aria-expanded"], "false");
    assert.equal(buttons[2].attributes["aria-pressed"], "false");
});

test("les deux vraies navigations de l'accueil sont conservees", () => {
    const navs = elementsByTag(INDEX_DOCUMENT, "nav");

    assert.equal(navs.length, 2);
    assert.deepEqual(navs.map((nav) => nav.attributes["aria-label"]), [
        "Sections MeteoSignal",
        "Navigation mobile MeteoSignal"
    ]);
});

test("chaque vraie navigation contient des liens", () => {
    elementsByTag(INDEX_DOCUMENT, "nav").forEach((nav) => {
        assert.ok(elementsByTag(nav, "a").filter((link) => link.attributes.href).length > 0);
    });
});

test("le footer affiche la version publique finale", () => {
    const status = elementByClass(INDEX_DOCUMENT, "development-status");
    const text = normalizeText(textContent(status));

    assert.match(text, /Version : v1\.5\.1/);
    assert.match(text, /Build : 2026-07-17/);
    assert.match(text, /Dernière mise à jour : 17 juillet 2026/);
    assert.match(text, /MeteoSignal © 2026/);
    assert.equal((text.match(/v1\.5\.1/g) ?? []).length, 1);
    assert.doesNotMatch(text, /Développement en cours|Version en préparation|Version publique : v1\.4\.2|1\.5\.1-release/);
    assert.doesNotMatch(text, /14 juillet 2026|Version : --|Build : --|Dernière mise à jour : --/);
    assert.match(INDEX_SOURCE, /id="project-status-version"/);
});

test("confidentialite.html contient un seul H1", () => {
    assert.equal(elementsByTag(PRIVACY_DOCUMENT, "h1").length, 1);
});

test("les douze H2 numerotes de confidentialite sont conserves", () => {
    const headings = elementsByTag(PRIVACY_DOCUMENT, "h2");

    assert.equal(headings.length, 12);
    headings.forEach((heading, index) => {
        assert.match(normalizeText(textContent(heading)), new RegExp(`^${index + 1}\\.`));
    });
});

test("les douze sections de confidentialite n'ont plus aria-labelledby", () => {
    const sections = elementsByTag(PRIVACY_DOCUMENT, "section");

    assert.equal(sections.length, 12);
    sections.forEach((section) => assert.equal(section.attributes["aria-labelledby"], undefined));
});

test("aucune section de confidentialite n'est forcee en region", () => {
    elementsByTag(PRIVACY_DOCUMENT, "section").forEach((section) => {
        assert.notEqual(section.attributes.role, "region");
        assert.equal(section.attributes["aria-label"], undefined);
    });
});

test("les douze identifiants des titres de confidentialite sont preserves", () => {
    assert.deepEqual(elementsByTag(PRIVACY_DOCUMENT, "h2").map((heading) => heading.attributes.id), PRIVACY_HEADING_IDS);
});

test("toutes les references ARIA pointent vers un identifiant existant", () => {
    [INDEX_DOCUMENT, PRIVACY_DOCUMENT].forEach((document) => {
        const ids = new Set(allElements(document).map((element) => element.attributes.id).filter(Boolean));

        ["aria-labelledby", "aria-describedby", "aria-controls"].forEach((attribute) => {
            elementsWithAttribute(document, attribute).forEach((element) => {
                element.attributes[attribute].split(/\s+/).filter(Boolean).forEach((id) => assert.ok(
                    ids.has(id),
                    `${attribute} reference un identifiant absent : ${id}`
                ));
            });
        });
    });
});

test("les deux regions live de P1C-3 restent les seules regions live", () => {
    const liveRegions = elementsWithAttribute(INDEX_DOCUMENT, "aria-live");

    assert.deepEqual(liveRegions.map((element) => element.attributes.id), ["app-status", "search-status"]);
});

test("la semantique dynamique et le focus des favoris restent branches", () => {
    const lists = elementsWithAttribute(INDEX_DOCUMENT, "data-favorites-list");

    assert.equal(lists.length, 1);
    assert.equal(lists[0].attributes.role, undefined);
    assert.match(FAVORITES_SOURCE, /list\.removeAttribute\("role"\)/);
    assert.match(FAVORITES_SOURCE, /list\.setAttribute\("role", "list"\)/);
    assert.match(FAVORITES_SOURCE, /item\.setAttribute\("role", "listitem"\)/);
    assert.match(FAVORITES_SOURCE, /restoreFavoriteFocus/);
});

test("les contenus textuels visibles des deux pages correspondent aux references validees", () => {
    assert.equal(visibleTextHash(INDEX_DOCUMENT), EXPECTED_VISIBLE_HASHES.index);
    assert.equal(visibleTextHash(PRIVACY_DOCUMENT), EXPECTED_VISIBLE_HASHES.privacy);
});

test("les deux documents ont une structure fermee et des identifiants uniques", () => {
    [INDEX_DOCUMENT, PRIVACY_DOCUMENT].forEach((document) => {
        assert.deepEqual(document.errors, []);
        const ids = allElements(document).map((element) => element.attributes.id).filter(Boolean);
        assert.equal(new Set(ids).size, ids.length);
        assert.equal(elementsByTag(document, "html").length, 1);
        assert.equal(elementsByTag(document, "body").length, 1);
    });
});

test("les landmarks natifs principaux de confidentialite sont preserves", () => {
    assert.equal(elementsByTag(PRIVACY_DOCUMENT, "header").length, 1);
    assert.equal(elementsByTag(PRIVACY_DOCUMENT, "main").length, 1);
    assert.equal(elementsByTag(PRIVACY_DOCUMENT, "footer").length, 1);
    assert.equal(elementsByTag(PRIVACY_DOCUMENT, "article").length, 1);
});

test("la classe favorites-title reprend exactement le style du titre precedent", () => {
    const declarations = parseDeclarations(cssRule(COMPONENTS_SOURCE, ".favorites-title"));

    assert.deepEqual(declarations, {
        margin: "0",
        color: "var(--color-white)",
        "font-size": "1.02rem",
        "font-weight": "700",
        "line-height": "1.2",
        "text-shadow": "0 0 18px rgba(47, 247, 255, 0.22)"
    });
});

test("aucune regle CSS morte ne cible les anciennes variantes des favoris", () => {
    assert.doesNotMatch(`${COMPONENTS_SOURCE}\n${RESPONSIVE_SOURCE}`, /\.favorites-heading\s+h2/);
    assert.match(RESPONSIVE_SOURCE, /\.favorites-title\s*\{/);
    assert.doesNotMatch(`${COMPONENTS_SOURCE}\n${RESPONSIVE_SOURCE}`, /data-favorites-placement|favorites-disclosure/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseHtml(source) {
    const root = { tagName: "#document", attributes: {}, children: [], errors: [] };
    const stack = [root];
    const voidElements = new Set([
        "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
    ]);
    const tokens = source.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g) ?? [];

    tokens.forEach((token) => {
        if (token.startsWith("<!--") || token.startsWith("<!")) {
            return;
        }

        const closing = token.match(/^<\/\s*([A-Za-z][\w:-]*)\s*>$/);

        if (closing) {
            const tagName = closing[1].toLowerCase();
            const current = stack.at(-1);

            if (current.tagName !== tagName) {
                root.errors.push(`Fermeture </${tagName}> inattendue apres <${current.tagName}>`);
                return;
            }

            stack.pop();
            return;
        }

        const opening = token.match(/^<\s*([A-Za-z][\w:-]*)([\s\S]*?)\/?\s*>$/);

        if (opening) {
            const tagName = opening[1].toLowerCase();
            const element = {
                tagName,
                attributes: parseAttributes(opening[2]),
                children: []
            };
            stack.at(-1).children.push(element);

            if (!voidElements.has(tagName) && !/\/\s*>$/.test(token)) {
                stack.push(element);
            }

            return;
        }

        stack.at(-1).children.push({ tagName: "#text", value: token, attributes: {}, children: [] });
    });

    if (stack.length > 1) {
        root.errors.push(`Elements non fermes : ${stack.slice(1).map((element) => element.tagName).join(", ")}`);
    }

    return root;
}

function parseAttributes(source) {
    const attributes = {};
    const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

    for (const match of source.matchAll(attributePattern)) {
        attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    return attributes;
}

function allElements(node) {
    const elements = [];

    for (const child of node.children ?? []) {
        if (child.tagName !== "#text") {
            elements.push(child, ...allElements(child));
        }
    }

    return elements;
}

function elementsByTag(node, tagName) {
    return allElements(node).filter((element) => element.tagName === tagName);
}

function headingElements(node) {
    return allElements(node).filter((element) => /^h[1-6]$/.test(element.tagName));
}

function elementsWithAttribute(node, attribute) {
    return allElements(node).filter((element) => Object.hasOwn(element.attributes, attribute));
}

function elementById(node, id) {
    return allElements(node).find((element) => element.attributes.id === id) ?? null;
}

function elementByClass(node, className) {
    return allElements(node).find((element) => hasClass(element, className)) ?? null;
}

function hasClass(element, className) {
    return element.attributes.class?.split(/\s+/).includes(className) ?? false;
}

function textContent(node) {
    if (!node) return "";
    if (node.tagName === "#text") return node.value;
    return (node.children ?? []).map(textContent).join("");
}

function normalizeText(value) {
    return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
    const named = new Map([
        ["amp", "&"], ["apos", "'"], ["eacute", "é"], ["egrave", "è"],
        ["gt", ">"], ["lt", "<"], ["nbsp", " "], ["quot", "\""]
    ]);

    return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, token) => {
        if (token.startsWith("#x")) return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
        if (token.startsWith("#")) return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
        return named.get(token.toLowerCase()) ?? entity;
    });
}

function visibleTextHash(document) {
    const body = elementsByTag(document, "body")[0];
    const excluded = new Set(["script", "style", "template", "noscript"]);

    function collect(node) {
        if (node.tagName === "#text") return node.value;
        if (excluded.has(node.tagName)) return "";
        return (node.children ?? []).map(collect).join(" ");
    }

    return crypto.createHash("sha256").update(normalizeText(collect(body))).digest("hex");
}

function cssRule(source, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));

    assert.ok(match, `Regle CSS absente : ${selector}`);
    return match[1];
}

function parseDeclarations(source) {
    return Object.fromEntries(source
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .map((declaration) => {
            const separator = declaration.indexOf(":");
            return [declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim()];
        }));
}
