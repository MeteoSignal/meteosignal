import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESPONSIVE_SOURCE = read("css/responsive.css");
const COMPONENTS_SOURCE = read("css/components.css");
const LAYOUT_SOURCE = read("css/layout.css");
const COMPONENT_RULES = parseRules(COMPONENTS_SOURCE);
const MEDIA_BLOCKS = parseMediaBlocks(RESPONSIVE_SOURCE);
const SMALL_MOBILE = findMediaBlock((block) => block.maxWidth === 430, "max-width 430px");
const MOBILE = findMediaBlock((block) => block.maxWidth === 720, "max-width 720px");
const TOUCH = findMediaBlock(
    (block) => block.query.includes("hover: none")
        && block.query.includes("pointer: coarse")
        && block.minWidth === null,
    "interaction tactile"
);
const TOUCH_DESKTOP = findMediaBlock(
    (block) => block.query.includes("hover: none")
        && block.query.includes("pointer: coarse")
        && block.minWidth === 1180
        && block.maxWidth === 1599,
    "interaction tactile desktop"
);

test("les textes essentiels du hero reviennent a la ligne sous 430 pixels", () => {
    for (const selector of [
        ".weather-summary h1",
        ".weather-description",
        ".data-source-label--hero"
    ]) {
        const declarations = declarationsFor(SMALL_MOBILE, selector);

        assert.match(declarations, /overflow:\s*visible\s*;/);
        assert.match(declarations, /overflow-wrap:\s*anywhere\s*;/);
        assert.match(declarations, /text-overflow:\s*clip\s*;/);
        assert.match(declarations, /white-space:\s*normal\s*;/);
        assert.doesNotMatch(declarations, /text-overflow:\s*ellipsis\s*;/);
        assert.doesNotMatch(declarations, /white-space:\s*nowrap\s*;/);
    }
});

test("le hero mobile reste libre de grandir avec son contenu", () => {
    for (const media of [MOBILE, SMALL_MOBILE]) {
        for (const selector of [".hero-weather", ".hero-content"]) {
            const declarations = declarationsFor(media, selector);

            assert.doesNotMatch(declarations, /(?:^|;)\s*height\s*:/m);
            assert.doesNotMatch(declarations, /(?:^|;)\s*max-height\s*:/m);
        }
    }
});

test("les commandes tactiles principales disposent d une cible de 44 pixels", () => {
    for (const selector of [
        ".search-panel input",
        ".hourly-range-button",
        ".mobile-bottom-link"
    ]) {
        assert.match(declarationsFor(TOUCH, selector), /min-height:\s*2\.75rem\s*;/, selector);
    }

    for (const selector of [
        ".site-header .icon-action",
        ".search-panel .icon-action"
    ]) {
        const declarations = declarationsFor(TOUCH, selector);

        assert.match(declarations, /width:\s*2\.75rem\s*;/, selector);
        assert.match(declarations, /min-width:\s*2\.75rem\s*;/, selector);
        assert.match(declarations, /height:\s*2\.75rem\s*;/, selector);
    }

    assert.match(declarationsFor(TOUCH, ".hourly-range-button"), /min-width:\s*2\.75rem\s*;/);

    for (const selector of [".nav-link", ".nav-collapse"]) {
        assert.match(declarationsFor(TOUCH_DESKTOP, selector), /min-height:\s*2\.75rem\s*;/, selector);
    }
});

test("les controles deja conformes conservent leurs dimensions existantes", () => {
    assert.match(declarationsForRules(COMPONENT_RULES, ".favorites-disclosure"), /min-height:\s*2\.75rem\s*;/);
    assert.match(declarationsForRules(COMPONENT_RULES, ".favorite-select"), /min-height:\s*2\.75rem\s*;/);

    const removeDeclarations = declarationsForRules(COMPONENT_RULES, ".favorite-remove");
    assert.match(removeDeclarations, /width:\s*2\.75rem\s*;/);
    assert.match(removeDeclarations, /min-width:\s*2\.75rem\s*;/);
});

test("la zone tactile grandit sans agrandir les pictogrammes", () => {
    const iconSelectors = parseRules(TOUCH.body).filter((rule) => rule.selectors.some((selector) => (
        selector.includes("[aria-hidden")
        || selector.includes(" svg")
        || selector.includes(" img")
        || selector.includes("-icon")
    )));

    assert.deepEqual(iconSelectors, []);
});

test("les breakpoints desktop 1180 et 1600 pixels restent presents", () => {
    assert.ok(MEDIA_BLOCKS.some((block) => block.minWidth === 1180));
    assert.ok(MEDIA_BLOCKS.some((block) => block.minWidth === 1600));
});

test("les scenes et les couches visuelles du hero restent intactes", () => {
    assert.match(LAYOUT_SOURCE, /--hero-scene-position:\s*64%\s+50%\s*;/);
    assert.match(LAYOUT_SOURCE, /object-position:\s*var\(--hero-scene-position\)\s*;/);
    assert.match(LAYOUT_SOURCE, /\.hero-media::after\s*\{[\s\S]*linear-gradient\(90deg/s);
    assert.match(LAYOUT_SOURCE, /\.hero-weather::before\s*\{\s*display:\s*none\s*;\s*\}/s);
    assert.match(LAYOUT_SOURCE, /\.hero-weather::after\s*\{\s*display:\s*none\s*;\s*\}/s);
    assert.doesNotMatch(`${RESPONSIVE_SOURCE}\n${LAYOUT_SOURCE}`, /url\s*\(/i);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function findMediaBlock(predicate, label) {
    const block = MEDIA_BLOCKS.find(predicate);

    assert.ok(block, `Bloc media introuvable : ${label}`);
    return block;
}

function declarationsFor(media, targetSelector) {
    return parseRules(media.body)
        .filter((rule) => rule.selectors.includes(targetSelector))
        .map((rule) => rule.body)
        .join("\n");
}

function declarationsForRules(rules, targetSelector) {
    return rules
        .filter((rule) => rule.selectors.includes(targetSelector))
        .map((rule) => rule.body)
        .join("\n");
}

function parseMediaBlocks(source) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = [];
    let cursor = 0;

    while (cursor < css.length) {
        const start = css.indexOf("@media", cursor);

        if (start === -1) {
            break;
        }

        const openBrace = css.indexOf("{", start);
        const closeBrace = findMatchingBrace(css, openBrace);
        const query = css.slice(start + "@media".length, openBrace).trim();

        blocks.push({
            query,
            minWidth: readWidth(query, "min"),
            maxWidth: readWidth(query, "max"),
            body: css.slice(openBrace + 1, closeBrace)
        });
        cursor = closeBrace + 1;
    }

    return blocks;
}

function parseRules(source) {
    const rules = [];
    let cursor = 0;

    while (cursor < source.length) {
        const openBrace = source.indexOf("{", cursor);

        if (openBrace === -1) {
            break;
        }

        const closeBrace = findMatchingBrace(source, openBrace);
        const selector = source.slice(cursor, openBrace).trim();

        if (selector && !selector.startsWith("@")) {
            rules.push({
                selectors: selector.split(",").map((item) => item.trim()),
                body: source.slice(openBrace + 1, closeBrace)
            });
        }

        cursor = closeBrace + 1;
    }

    return rules;
}

function findMatchingBrace(source, openBrace) {
    assert.notEqual(openBrace, -1, "Accolade ouvrante introuvable");
    let depth = 0;

    for (let index = openBrace; index < source.length; index += 1) {
        if (source[index] === "{") {
            depth += 1;
        } else if (source[index] === "}") {
            depth -= 1;

            if (depth === 0) {
                return index;
            }
        }
    }

    assert.fail("Bloc CSS non ferme");
}

function readWidth(query, boundary) {
    const match = query.match(new RegExp(`${boundary}-width:\\s*(\\d+)px`));
    return match ? Number(match[1]) : null;
}
