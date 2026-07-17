import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETLINKS_PATH = path.join(ROOT, ".well-known", "assetlinks.json");
const ASSETLINKS_SOURCE = fs.readFileSync(ASSETLINKS_PATH, "utf8");
const RELATION = "delegate_permission/common.handle_all_urls";
const PACKAGE_NAME = "fr.meteosignal.app";
const LOCAL_FINGERPRINT = "4C:44:88:8F:DE:78:E3:C8:9B:3B:1E:47:E9:D7:A0:B5:D1:B6:79:3E:A7:F8:D3:EF:87:D0:FA:E6:66:63:79:48";
const PLAY_FINGERPRINT = "6B:2F:75:FE:65:8A:97:90:AE:58:86:D5:08:DF:AF:BD:5E:FC:50:12:99:17:72:CD:58:9A:66:0B:E1:E8:D3:C7";
const EXPECTED_FINGERPRINTS = [LOCAL_FINGERPRINT, PLAY_FINGERPRINT];

test("assetlinks est un JSON strict contenant une seule declaration Android", () => {
    assert.doesNotThrow(() => JSON.parse(ASSETLINKS_SOURCE));
    const statements = parseAssetLinks();

    assert.equal(Array.isArray(statements), true);
    assert.equal(statements.length, 1);
    assert.deepEqual(statements[0], {
        relation: [RELATION],
        target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: EXPECTED_FINGERPRINTS
        }
    });
});

test("les empreintes locale et Google Play sont uniques, completes et majuscules", () => {
    const fingerprints = parseAssetLinks()[0].target.sha256_cert_fingerprints;
    const fingerprintPattern = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

    assert.deepEqual(fingerprints, EXPECTED_FINGERPRINTS);
    assert.equal(fingerprints.includes(LOCAL_FINGERPRINT), true);
    assert.equal(fingerprints.includes(PLAY_FINGERPRINT), true);
    assert.equal(new Set(fingerprints).size, fingerprints.length);
    for (const fingerprint of fingerprints) {
        assert.match(fingerprint, fingerprintPattern);
        assert.equal(fingerprint.split(":").length, 32);
        assert.equal(fingerprint, fingerprint.toUpperCase());
    }
});

test("la declaration ne contient aucune relation, package ou propriete supplementaire", () => {
    const statement = parseAssetLinks()[0];

    assert.deepEqual(Object.keys(statement), ["relation", "target"]);
    assert.deepEqual(statement.relation, [RELATION]);
    assert.deepEqual(Object.keys(statement.target), [
        "namespace",
        "package_name",
        "sha256_cert_fingerprints"
    ]);
    assert.equal(statement.target.namespace, "android_app");
    assert.equal(statement.target.package_name, PACKAGE_NAME);
    assert.doesNotMatch(ASSETLINKS_SOURCE, /password|private|secret|token|keystore/i);
});

test("le domaine web canonique correspond a l'origine TWA inspectee", () => {
    const cname = read("CNAME").trim();
    const manifest = JSON.parse(read("manifest.json"));

    assert.equal(cname, "meteosignal.fr");
    assert.equal(`https://${cname}`, "https://meteosignal.fr");
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    assert.equal(parseAssetLinks()[0].target.package_name, PACKAGE_NAME);
});

test("aucun fichier de signature prive ou marqueur de cle privee n'est suivi par Git", () => {
    const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
        cwd: ROOT,
        encoding: "utf8"
    }).split("\0").filter(Boolean);
    const sensitivePath = /(^|\/)(?:\.env(?:\.|$)|google-services\.json$|.*service-account.*\.json$|.*\.(?:jks|keystore|p12|pfx|pkcs12|key)$)/i;
    const textFile = /\.(?:css|gradle|html|js|json|md|mjs|txt|xml|ya?ml)$/i;

    assert.equal(trackedFiles.some((file) => sensitivePath.test(file)), false);
    for (const file of trackedFiles.filter((target) => textFile.test(target))) {
        assert.doesNotMatch(
            fs.readFileSync(path.join(ROOT, file), "utf8"),
            /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
            file
        );
    }
});

test("assetlinks reste hors precache et les API meteo restent network-only", () => {
    const sw = read("sw.js");
    const assets = [
        ...parseStringArray(sw, "ESSENTIAL_ASSETS"),
        ...parseStringArray(sw, "OPTIONAL_ASSETS")
    ];

    assert.equal(assets.includes("./.well-known/assetlinks.json"), false);
    assert.equal(assets.some((asset) => /open-meteo\.com/i.test(asset)), false);
    assert.match(sw, /if \(isWeatherApiRequest\(requestUrl\)\)\s*\{\s*event\.respondWith\(fetch\(request\)\);/s);
    assert.doesNotMatch(sw, /\bcache\.put\s*\(/);
    assert.equal(JSON.parse(read("package.json")).version, "1.5.0");
    assert.match(read("config/config.js"), /version:\s*"1\.5\.0"/);
});

function parseAssetLinks() {
    return JSON.parse(ASSETLINKS_SOURCE);
}

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseStringArray(source, name) {
    const body = source.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))?.[1] ?? "";
    return [...body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}
