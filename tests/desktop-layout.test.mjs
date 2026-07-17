import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESPONSIVE_SOURCE = fs.readFileSync(path.join(ROOT, "css", "responsive.css"), "utf8");
const MEDIA_BLOCKS = parseMediaBlocks(RESPONSIVE_SOURCE);
const DESKTOP_1180 = findMediaBlock({ minWidth: 1180 });
const DESKTOP_1600 = findMediaBlock({ minWidth: 1600 });
const MOBILE_720 = findMediaBlock({ maxWidth: 720 });

test("le breakpoint desktop 1180 applique la hauteur fluide au hero et a son contenu", () => {
    assert.match(declarationsFor(DESKTOP_1180, ".hero-weather"), /min-height:\s*clamp\(32rem,\s*34vw,\s*34rem\)\s*;/);
    assert.match(declarationsFor(DESKTOP_1180, ".hero-content"), /min-height:\s*clamp\(32rem,\s*34vw,\s*34rem\)\s*;/);
});

test("le contenu desktop conserve les espacements valides sans hauteur fixe", () => {
    const declarations = declarationsFor(DESKTOP_1180, ".hero-content");

    assert.match(declarations, /gap:\s*1\.5rem\s*;/);
    assert.match(declarations, /padding:\s*2rem\s+2\.5rem\s*;/);
    assert.doesNotMatch(declarations, /(?:^|;)\s*height\s*:/m);
    assert.doesNotMatch(declarations, /(?:^|;)\s*max-height\s*:/m);
    assert.doesNotMatch(declarations, /(?:^|;)\s*overflow\s*:\s*hidden\s*;/m);
});

test("les metriques du hero restent alignees a gauche dans une largeur bornee", () => {
    const declarations = declarationsFor(DESKTOP_1180, ".hero-metrics");

    assert.match(declarations, /width:\s*min\(100%,\s*56rem\)\s*;/);
    assert.doesNotMatch(declarations, /margin(?:-inline)?:\s*auto\s*;/);
    assert.doesNotMatch(declarations, /justify-(?:content|items):\s*center\s*;/);
});

test("les anciennes hauteurs desktop du hero ne sont plus actives", () => {
    for (const media of MEDIA_BLOCKS.filter((block) => block.minWidth >= 1180)) {
        const declarations = [
            declarationsFor(media, ".hero-weather"),
            declarationsFor(media, ".hero-content")
        ].join("\n");

        assert.doesNotMatch(declarations, /min-height:\s*(?:35|36\.5)rem\s*;/, media.query);
    }
});

test("la grille des indicateurs reste en trois colonnes des 1180 pixels", () => {
    assert.match(
        declarationsFor(DESKTOP_1180, ".weather-grid"),
        /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*;/
    );
});

test("aucun breakpoint inferieur a 1600 pixels n'active six colonnes", () => {
    const prematureDesktopBlocks = MEDIA_BLOCKS.filter((block) => (
        block.minWidth >= 1180 && block.minWidth < 1600
    ));

    for (const media of prematureDesktopBlocks) {
        assert.doesNotMatch(
            declarationsFor(media, ".weather-grid"),
            /grid-template-columns:\s*repeat\(6,/,
            media.query
        );
    }
});

test("les six colonnes commencent uniquement au breakpoint 1600 pixels", () => {
    assert.match(
        declarationsFor(DESKTOP_1600, ".weather-grid"),
        /grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)\s*;/
    );
});

test("les regles essentielles du hero mobile restent intactes", () => {
    const heroDeclarations = declarationsFor(MOBILE_720, ".hero-weather");
    const contentDeclarations = declarationsFor(MOBILE_720, ".hero-content");

    assert.match(heroDeclarations, /min-height:\s*0\s*;/);
    assert.match(contentDeclarations, /min-height:\s*0\s*;/);
    assert.match(contentDeclarations, /display:\s*grid\s*;/);
    assert.match(contentDeclarations, /gap:\s*0\.68rem\s*;/);
    assert.match(contentDeclarations, /padding:\s*0\.78rem\s*;/);
});

function findMediaBlock(criteria) {
    const block = MEDIA_BLOCKS.find((item) => (
        (criteria.minWidth === undefined || item.minWidth === criteria.minWidth)
        && (criteria.maxWidth === undefined || item.maxWidth === criteria.maxWidth)
    ));

    assert.ok(block, `Bloc media introuvable : ${JSON.stringify(criteria)}`);
    return block;
}

function declarationsFor(media, targetSelector) {
    return parseRules(media.body)
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
