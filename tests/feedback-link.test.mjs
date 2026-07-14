import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const PRIVACY_SOURCE = read("confidentialite.html");
const COMPONENTS_SOURCE = read("css/components.css");
const SW_SOURCE = read("sw.js");
const FEEDBACK_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfOQypJBgcKy1KcQ187O_vd8rf65cAhotRveU4s7kMgogfQVw/viewform";

test("le footer contient un unique lien de retour utilisateur externe et securise", () => {
    const link = tagById(INDEX_SOURCE, "feedback-footer-link");

    assert.notEqual(link, "");
    assert.equal((INDEX_SOURCE.match(/id="feedback-footer-link"/g) ?? []).length, 1);
    assert.equal(attribute(link, "href"), FEEDBACK_URL);
    assert.equal(attribute(link, "target"), "_blank");
    assert.deepEqual(new Set(attribute(link, "rel").split(/\s+/)), new Set(["noopener", "noreferrer"]));
});

test("le texte visible et l'indication accessible du nouvel onglet sont conserves", () => {
    const block = INDEX_SOURCE.match(/<a\b[^>]*id="feedback-footer-link"[\s\S]*?<\/a>/i)?.[0] ?? "";
    const visibleText = block
        .replace(/<span\b[^>]*class="sr-only"[^>]*>[\s\S]*?<\/span>/i, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    assert.equal(visibleText, "Votre avis compte");
    assert.match(block, /<span\b[^>]*class="sr-only"[^>]*>\s*\(ouvre dans un nouvel onglet\)<\/span>/i);
});

test("le lien precede la confidentialite sans iframe ni precache Google Forms", () => {
    const footer = INDEX_SOURCE.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "";
    const csp = INDEX_SOURCE.match(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/i)?.[0] ?? "";

    assert.ok(footer.indexOf("feedback-footer-link") < footer.indexOf("privacy-footer-link"));
    assert.doesNotMatch(`${INDEX_SOURCE}\n${PRIVACY_SOURCE}`, /<iframe\b/i);
    assert.doesNotMatch(SW_SOURCE, /docs\.google\.com|google\.com\/forms/i);
    assert.doesNotMatch(csp, /docs\.google\.com|google\.com\/forms/i);
});

test("les liens du footer utilisent un token valide et un focus explicite", () => {
    assert.doesNotMatch(COMPONENTS_SOURCE, /--color-cyan-200/);
    assert.match(COMPONENTS_SOURCE, /\.footer-link\s*\{[^}]*min-height:\s*2\.25rem;[^}]*color:\s*var\(--color-cyan-300\);/s);
    assert.match(COMPONENTS_SOURCE, /\.footer-link--feedback\s*\{[^}]*border:[^}]*background:[^}]*font-weight:\s*700;/s);
    assert.match(COMPONENTS_SOURCE, /\.footer-link:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-yellow-300\);/s);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function tagById(source, id) {
    return (source.match(/<a\b[^>]*>/gi) ?? [])
        .find((tag) => attribute(tag, "id") === id) ?? "";
}

function attribute(tag, name) {
    return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] ?? "";
}
