import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCUMENTS = ["index.html", "confidentialite.html"];
const DEPLOYMENT_REVISION = "1.4.2-immersive-dashboard-p6f";
const EXPECTED_CSP = new Map([
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["script-src", ["'self'"]],
    ["style-src", ["'self'"]],
    ["img-src", ["'self'"]],
    ["font-src", ["'self'"]],
    ["connect-src", [
        "'self'",
        "https://api.open-meteo.com",
        "https://geocoding-api.open-meteo.com",
        "https://air-quality-api.open-meteo.com"
    ]],
    ["manifest-src", ["'self'"]],
    ["worker-src", ["'self'"]],
    ["frame-src", ["'none'"]],
    ["media-src", ["'none'"]],
    ["form-action", ["'self'"]]
]);

test("les deux documents appliquent la meme CSP stricte avant toute ressource", () => {
    const policies = DOCUMENTS.map((file) => {
        const source = read(file);
        const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
        const cspTag = findMeta(head, "http-equiv", "Content-Security-Policy");
        const csp = parseCsp(attribute(cspTag, "content"));
        const firstResource = head.search(/<(?:link|style|script)\b/i);

        assert.notEqual(cspTag, "", file);
        assert.ok(head.indexOf(cspTag) < firstResource, file);
        assert.deepEqual(csp, EXPECTED_CSP, file);
        return attribute(cspTag, "content");
    });

    assert.equal(policies[0], policies[1]);
});

test("la CSP exclut les assouplissements et directives incompatibles avec une balise meta", () => {
    const policy = attribute(findMeta(read("index.html"), "http-equiv", "Content-Security-Policy"), "content");
    const directives = parseCsp(policy);
    const sourceTokens = [...directives.values()].flat();

    assert.equal(sourceTokens.includes("'unsafe-inline'"), false);
    assert.equal(sourceTokens.includes("'unsafe-eval'"), false);
    assert.equal(sourceTokens.includes("*"), false);
    assert.equal(sourceTokens.includes("data:"), false);
    assert.equal(sourceTokens.includes("blob:"), false);
    assert.equal(sourceTokens.some((source) => source.startsWith("http:")), false);
    assert.equal(directives.has("frame-ancestors"), false);
    assert.equal(directives.has("report-uri"), false);
    assert.equal(directives.has("report-to"), false);
    assert.equal(directives.has("sandbox"), false);
    assert.equal(directives.get("connect-src").includes("https://example.com"), false);
});

test("la politique de referent est explicite et les metadonnees suivent l'ordre attendu", () => {
    for (const file of DOCUMENTS) {
        const source = read(file);
        const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
        const charset = findMeta(head, "charset", "UTF-8");
        const viewport = findMeta(head, "name", "viewport");
        const csp = findMeta(head, "http-equiv", "Content-Security-Policy");
        const referrer = findMeta(head, "name", "referrer");
        const description = findMeta(head, "name", "description");
        const titleIndex = head.search(/<title\b/i);
        const firstResourceIndex = head.search(/<link\b/i);
        const positions = [charset, viewport, csp, referrer, description]
            .map((tag) => head.indexOf(tag));

        assert.equal(attribute(referrer, "content"), "strict-origin-when-cross-origin", file);
        assert.ok(positions.every((position) => position >= 0), file);
        assert.deepEqual([...positions].sort((a, b) => a - b), positions, file);
        assert.ok(positions.at(-1) < titleIndex, file);
        assert.ok(titleIndex < firstResourceIndex, file);
    }
});

test("aucun contenu executable ou style inline ne subsiste dans les documents", () => {
    for (const file of DOCUMENTS) {
        const source = read(file);
        const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];

        assert.doesNotMatch(source, /<style\b/i, file);
        assert.doesNotMatch(source, /\sstyle\s*=/i, file);
        assert.doesNotMatch(source, /\son[a-z]+\s*=/i, file);
        assert.doesNotMatch(source, /javascript:/i, file);
        assert.ok(scripts.length > 0, file);
        for (const script of scripts) {
            assert.match(script[1], /\ssrc\s*=\s*"[^"]+"/i, file);
            assert.equal(script[2].trim(), "", file);
        }
    }
});

test("le code applicatif ne cree aucun element actif interdit dynamiquement", () => {
    const runtimeSources = listFiles(path.join(ROOT, "js"), (file) => file.endsWith(".js"))
        .concat([path.join(ROOT, "pwa.js"), path.join(ROOT, "sw.js")])
        .map((file) => fs.readFileSync(file, "utf8"))
        .join("\n");

    assert.doesNotMatch(runtimeSources, /\beval\s*\(/);
    assert.doesNotMatch(runtimeSources, /\bnew\s+Function\b/);
    assert.doesNotMatch(runtimeSources, /document\.write\s*\(/);
    assert.doesNotMatch(runtimeSources, /createElement\s*\(\s*["'](?:script|style|iframe|object|embed)["']/i);
    assert.doesNotMatch(runtimeSources, /data:image|blob:/i);
});

test("le CSS de confidentialite est externe, versionne et complet", () => {
    const source = read("confidentialite.html");
    const css = read("css/privacy.css");
    const stylesheets = [...source.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)];

    assert.deepEqual(stylesheets.map((match) => match[1]), [
        `css/privacy.css?v=${DEPLOYMENT_REVISION}`
    ]);
    assert.doesNotMatch(css, /@import\b/i);
    assert.match(css, /^:root\s*\{/);
    assert.match(css, /\.privacy-card\s*\{[^}]*backdrop-filter:\s*blur\(18px\);/s);
    assert.match(css, /@media \(max-width: 600px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.equal((css.match(/{/g) ?? []).length, (css.match(/}/g) ?? []).length);
});

test("toutes les ressources locales des documents et tous les imports modules existent", () => {
    for (const file of DOCUMENTS) {
        const source = read(file);
        const references = [...source.matchAll(/<(?:link|script|img)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi)]
            .map((match) => match[1])
            .filter(isLocalResource);

        for (const reference of references) {
            assert.equal(fs.existsSync(resolveReference(ROOT, reference)), true, `${file}: ${reference}`);
        }
    }

    for (const file of listFiles(path.join(ROOT, "js"), (target) => target.endsWith(".js"))) {
        const source = fs.readFileSync(file, "utf8");
        for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
            if (match[1].startsWith(".")) {
                assert.equal(fs.existsSync(resolveReference(path.dirname(file), match[1])), true, `${file}: ${match[1]}`);
            }
        }
    }
});

test("la page et sa feuille sont precachees ensemble sans API ni doublon", () => {
    const sw = read("sw.js");
    const essential = parseStringArray(sw, "ESSENTIAL_ASSETS");
    const optional = parseStringArray(sw, "OPTIONAL_ASSETS");
    const assets = [...essential, ...optional];
    const privacyPageIndex = optional.indexOf("./confidentialite.html");

    assert.match(sw, /const DEPLOYMENT_REVISION = `\$\{APP_VERSION\}-immersive-dashboard-p6f`/);
    assert.match(sw, /const CACHE_VERSION = `v\$\{DEPLOYMENT_REVISION\}`/);
    assert.ok(privacyPageIndex >= 0);
    assert.equal(optional[privacyPageIndex + 1], "./css/privacy.css");
    assert.equal(new Set(assets).size, assets.length);
    assert.equal(assets.some((asset) => /open-meteo\.com/i.test(asset)), false);
    for (const asset of assets) {
        assert.equal(fs.existsSync(path.join(ROOT, asset.slice(2))), true, asset);
    }
});

test("les trois API exactes restent seules autorisees et network-only", () => {
    const config = read("config/config.js");
    const sw = read("sw.js");
    const configuredOrigins = [...config.matchAll(/https:\/\/[^"/]+/g)].map((match) => match[0]);
    const connectSources = parseCsp(
        attribute(findMeta(read("index.html"), "http-equiv", "Content-Security-Policy"), "content")
    ).get("connect-src").slice(1);

    assert.deepEqual(configuredOrigins, connectSources);
    assert.deepEqual([...sw.matchAll(/"([a-z-]+\.open-meteo\.com)"/g)].map((match) => `https://${match[1]}`), connectSources);
    assert.match(sw, /if \(isWeatherApiRequest\(requestUrl\)\)\s*\{\s*event\.respondWith\(fetch\(request\)\);/s);
    assert.doesNotMatch(sw, /\bcache\.put\s*\(/);
});

test("les parcours confidentialite et la version publique restent inchanges", () => {
    const index = read("index.html");
    const privacy = read("confidentialite.html");

    assert.equal((privacy.match(/<h2\b/g) ?? []).length, 12);
    assert.equal((privacy.match(/data-privacy-return/g) ?? []).length, 2);
    assert.equal((privacy.match(/href="mailto:/g) ?? []).length, 2);
    assert.match(privacy, /href="https:\/\/open-meteo\.com\/en\/terms"[^>]*rel="noopener noreferrer"/);
    assert.match(index, new RegExp(`js/app\\.js\\?v=${DEPLOYMENT_REVISION}`));
    assert.equal((`${index}\n${privacy}`.match(new RegExp(`js/privacy-return\\.js\\?v=${DEPLOYMENT_REVISION}`, "g")) ?? []).length, 2);
    assert.equal(JSON.parse(read("package.json")).version, "1.4.2");
    assert.match(read("config/config.js"), /version:\s*"1\.4\.2"/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function attribute(tag, name) {
    return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1] ?? "";
}

function findMeta(source, attributeName, value) {
    return (source.match(/<meta\b[^>]*>/gi) ?? [])
        .find((tag) => attribute(tag, attributeName).toLowerCase() === value.toLowerCase()) ?? "";
}

function parseCsp(policy) {
    const directives = new Map();

    for (const segment of policy.split(";")) {
        const tokens = segment.trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) {
            continue;
        }

        const [name, ...sources] = tokens;
        assert.equal(directives.has(name), false, `directive CSP dupliquee: ${name}`);
        directives.set(name, sources);
    }

    return directives;
}

function parseStringArray(source, name) {
    const body = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))?.[1] ?? "";
    return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function isLocalResource(reference) {
    return !/^(?:[a-z]+:|#|\/\/)/i.test(reference);
}

function resolveReference(base, reference) {
    const pathname = reference.split(/[?#]/, 1)[0].replace(/^\.\//, "");
    return path.resolve(base, ...pathname.split("/"));
}

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(target, predicate) : (predicate(target) ? [target] : []);
    });
}
