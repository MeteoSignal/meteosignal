import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAYOUT_SOURCE = fs.readFileSync(path.join(ROOT, "css", "layout.css"), "utf8");
const RULES = parseRules(LAYOUT_SOURCE);

test("les deux couches decoratives du hero sont desactivees", () => {
    for (const selector of [".hero-weather::before", ".hero-weather::after"]) {
        const declarations = declarationsForExactSelector(selector);

        assert.match(declarations, /^\s*display:\s*none\s*;\s*$/);
        assert.doesNotMatch(
            declarations,
            /mix-blend-mode|repeating-radial-gradient|linear-gradient|radial-gradient|opacity\s*:/
        );
    }
});

test("le voile de contraste reste present au-dessus de la scene", () => {
    const declarations = declarationsForExactSelector(".hero-media::after");

    assert.match(declarations, /z-index:\s*1\s*;/);
    assert.match(declarations, /linear-gradient\(90deg/);
    assert.match(declarations, /rgb\(1 8 24 \/ 0\.8\)\s+0%/);
    assert.match(declarations, /rgb\(1 10 29 \/ 0\.6\)\s+24%/);
    assert.match(declarations, /rgb\(1 10 29 \/ 0\.24\)\s+43%/);
    assert.match(declarations, /rgb\(1 10 29 \/ 0\.06\)\s+61%/);
    assert.match(declarations, /transparent\s+76%/);
    assert.match(declarations, /linear-gradient\(180deg/);
    assert.match(declarations, /rgb\(2 18 48 \/ 0\.02\)/);
    assert.match(declarations, /rgb\(1 8 24 \/ 0\.1\)/);
});

test("la scene conserve son positionnement France et Europe", () => {
    const heroDeclarations = declarationsForExactSelector(".hero-weather");
    const imageDeclarations = declarationsForExactSelector(".hero-scene-image");

    assert.match(heroDeclarations, /--hero-scene-position:\s*64%\s+50%\s*;/);
    assert.match(imageDeclarations, /object-position:\s*var\(--hero-scene-position\)\s*;/);
});

test("aucune image n'est referencee directement depuis le CSS du layout", () => {
    assert.doesNotMatch(LAYOUT_SOURCE, /url\s*\(/i);
});

test("les deux fallbacks CSS du hero restent disponibles", () => {
    const heroDeclarations = declarationsForExactSelector(".hero-weather");
    const mediaDeclarations = declarationsForExactSelector(".hero-media");

    assert.match(heroDeclarations, /background:\s*[\s\S]*radial-gradient/);
    assert.match(heroDeclarations, /var\(--color-surface-strong\)/);
    assert.match(mediaDeclarations, /background:\s*[\s\S]*radial-gradient/);
    assert.match(mediaDeclarations, /linear-gradient\(135deg/);
});

function declarationsForExactSelector(selector) {
    const matchingRules = RULES.filter((rule) => (
        rule.selectors.length === 1 && rule.selectors[0] === selector
    ));

    assert.equal(matchingRules.length, 1, `Regle unique introuvable : ${selector}`);
    return matchingRules[0].body;
}

function parseRules(source) {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = [];
    let cursor = 0;

    while (cursor < css.length) {
        const openBrace = css.indexOf("{", cursor);

        if (openBrace === -1) {
            break;
        }

        const closeBrace = findMatchingBrace(css, openBrace);
        const selector = css.slice(cursor, openBrace).trim();

        if (selector && !selector.startsWith("@")) {
            rules.push({
                selectors: selector.split(",").map((item) => item.trim()),
                body: css.slice(openBrace + 1, closeBrace)
            });
        }

        cursor = closeBrace + 1;
    }

    return rules;
}

function findMatchingBrace(source, openBrace) {
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
