import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_REVISION = "1.5.2-location-sync";
const PRIVACY_CSS_REVISION = "1.5.2-location-sync";
const EXPECTED_STYLESHEETS = [
    "css/tokens.css",
    "css/base.css",
    "css/layout.css",
    "css/components.css",
    "css/responsive.css"
];

test("l'accueil charge directement les feuilles CSS dans l'ordre de cascade valide", () => {
    const stylesheets = readStylesheetLinks("index.html");

    assert.deepEqual(
        stylesheets.map(({ pathname }) => pathname),
        EXPECTED_STYLESHEETS
    );

    for (const stylesheet of stylesheets) {
        assert.equal(stylesheet.revision, CSS_REVISION, stylesheet.href);
        assert.equal(fs.existsSync(path.join(ROOT, ...stylesheet.pathname.split("/"))), true, stylesheet.href);
    }
});

test("le chemin de chargement initial ne contient plus aucun import CSS", () => {
    for (const stylesheet of EXPECTED_STYLESHEETS) {
        const source = fs.readFileSync(path.join(ROOT, ...stylesheet.split("/")), "utf8");
        assert.equal(/@import\b/.test(source), false, stylesheet);
    }

    const historicalEntryPoint = fs.readFileSync(path.join(ROOT, "css", "style.css"), "utf8");
    assert.equal(/@import\b/.test(historicalEntryPoint), false, "css/style.css");
});

test("style.css n'est plus reference a l'execution et la confidentialite charge son style externe", () => {
    const runtimeFiles = [
        "index.html",
        "confidentialite.html",
        "manifest.json",
        "pwa.js",
        "sw.js",
        ...listFiles(path.join(ROOT, "js"), (file) => file.endsWith(".js"))
            .map((file) => path.relative(ROOT, file))
    ];

    for (const file of runtimeFiles) {
        const source = fs.readFileSync(path.join(ROOT, file), "utf8");
        assert.equal(source.includes("css/style.css"), false, file);
    }

    assert.deepEqual(readStylesheetLinks("confidentialite.html"), [{
        href: `css/privacy.css?v=${PRIVACY_CSS_REVISION}`,
        pathname: "css/privacy.css",
        revision: PRIVACY_CSS_REVISION
    }]);
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, "confidentialite.html"), "utf8"), /<style\b/i);
});

test("l'accueil préconnecte uniquement les deux API météo initiales avant les styles", () => {
    const source = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const preconnects = [...source.matchAll(
        /<link\s+rel="preconnect"\s+href="([^"]+)"\s+crossorigin\s*\/?>/g
    )];
    const origins = preconnects.map((match) => match[1]);

    assert.equal((source.match(/rel="preconnect"/g) ?? []).length, 2);
    assert.deepEqual(origins, [
        "https://api.open-meteo.com",
        "https://air-quality-api.open-meteo.com"
    ]);
    assert.equal(new Set(origins).size, origins.length);
    assert.equal(origins.some((origin) => origin.includes("geocoding")), false);
    assert.ok(preconnects.every((match) => match.index < source.indexOf('<link rel="stylesheet"')));
});

function readStylesheetLinks(file) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");

    return [...source.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g)]
        .map((match) => {
            const url = new URL(match[1], "https://example.test/");
            return {
                href: match[1],
                pathname: url.pathname.replace(/^\//, ""),
                revision: url.searchParams.get("v")
            };
        });
}

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(target, predicate) : (predicate(target) ? [target] : []);
    });
}
