import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_FILES = ["tokens.css", "base.css", "layout.css", "components.css", "responsive.css"];
const CSS_SOURCES = new Map(CSS_FILES.map((file) => [
    file,
    fs.readFileSync(path.join(ROOT, "css", file), "utf8")
]));
const TOKENS_SOURCE = CSS_SOURCES.get("tokens.css");
const BASE_SOURCE = CSS_SOURCES.get("base.css");
const COMPONENTS_SOURCE = CSS_SOURCES.get("components.css");
const FOCUS_OUTLINE_PATTERN = /outline:\s*3px\s+solid\s+var\(--color-focus-ring\)\s*;/;

test("l'indicateur generique utilise un contour opaque separe du composant", () => {
    const rule = findRule(BASE_SOURCE, ":focus-visible");

    assert.ok(rule);
    assert.match(rule.body, FOCUS_OUTLINE_PATTERN);
    assert.match(rule.body, /outline-offset:\s*3px\s*;/);
    assert.doesNotMatch(rule.body, /outline:\s*(?:none|0)\b/);
});

test("le champ de recherche remplace explicitement sa suppression de contour", () => {
    const normalRule = findRule(COMPONENTS_SOURCE, ".search-panel input");
    const focusedRule = findRule(COMPONENTS_SOURCE, ".search-panel input:focus-visible");

    assert.match(normalRule.body, /outline:\s*0\s*;/);
    assert.match(focusedRule.body, FOCUS_OUTLINE_PATTERN);
    assert.match(focusedRule.body, /outline-offset:\s*3px\s*;/);
});

test("le bouton horaire actif reste distinct lorsqu'il recoit le focus", () => {
    const activeRule = findRule(COMPONENTS_SOURCE, ".hourly-range-button.is-active");
    const focusedActiveRule = findRule(
        COMPONENTS_SOURCE,
        ".hourly-range-button.is-active:focus-visible"
    );

    assert.match(activeRule.body, /background:/);
    assert.doesNotMatch(activeRule.body, /outline\s*:/);
    assert.match(focusedActiveRule.body, FOCUS_OUTLINE_PATTERN);
    assert.match(focusedActiveRule.body, /outline-offset:\s*3px\s*;/);
    assert.doesNotMatch(
        focusedActiveRule.body,
        /\b(?:display|position|inset|top|right|bottom|left|width|height|min-width|min-height|max-width|max-height|margin|padding|transform|font-size|line-height)\s*:/
    );
});

test("aucune suppression de contour CSS ne reste sans remplacement focus-visible", () => {
    const rules = [...CSS_SOURCES.entries()].flatMap(([file, source]) => (
        parseRules(source).map((rule) => ({ file, ...rule }))
    ));
    const suppressions = rules.flatMap((rule) => rule.selectors
        .filter(() => /outline:\s*(?:none|0)\b/.test(rule.body))
        .map((selector) => ({ file: rule.file, selector }))
    );

    for (const suppression of suppressions) {
        const replacement = rules.find((rule) => (
            rule.selectors.includes(`${suppression.selector}:focus-visible`)
            && /outline:\s*(?!none\b|0\b)[^;]+;/.test(rule.body)
        ));

        assert.ok(replacement, `${suppression.file}: ${suppression.selector}`);
    }
});

test("la couleur du focus est opaque et depasse 3 pour 1 sur les surfaces ciblees", () => {
    const focusHex = TOKENS_SOURCE.match(/--color-focus-ring:\s*(#[0-9a-f]{6})\s*;/i)?.[1];
    const representativeSurfaces = new Map([
        ["fond nocturne", "#031a3d"],
        ["carte", "#052450"],
        ["bouton horaire inactif", "#052550"],
        ["bouton horaire actif eclairci", "#157299"],
        ["image meteo assombrie", "#163b55"]
    ]);

    assert.equal(focusHex, "#ffe16d");
    for (const [surface, background] of representativeSurfaces) {
        const ratio = contrastRatio(focusHex, background);
        assert.ok(ratio >= 3, `${surface}: ${ratio.toFixed(2)}:1`);
    }
});

function parseRules(source) {
    return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
        selectors: match[1].split(",").map((selector) => selector.trim()),
        body: match[2]
    }));
}

function findRule(source, selector) {
    return parseRules(source).find((rule) => rule.selectors.includes(selector));
}

function contrastRatio(foreground, background) {
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    const lightest = Math.max(foregroundLuminance, backgroundLuminance);
    const darkest = Math.min(foregroundLuminance, backgroundLuminance);
    return (lightest + 0.05) / (darkest + 0.05);
}

function relativeLuminance(hex) {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    const [red, green, blue] = channels.map((channel) => (
        channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
