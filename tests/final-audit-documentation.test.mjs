import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = "docs/audit-final-v1.4.1.md";
const REPORT = read(REPORT_PATH);
const REFERENCE_SHA = "e96f9a1a6003f2f7bc58953e42954b989ab68068";
const LOCAL_FINGERPRINT = "4C:44:88:8F:DE:78:E3:C8:9B:3B:1E:47:E9:D7:A0:B5:D1:B6:79:3E:A7:F8:D3:EF:87:D0:FA:E6:66:63:79:48";
const PLAY_FINGERPRINT = "6B:2F:75:FE:65:8A:97:90:AE:58:86:D5:08:DF:AF:BD:5E:FC:50:12:99:17:72:CD:58:9A:66:0B:E1:E8:D3:C7";
const KEY_DOCUMENTS = [
    "README.md",
    "PROJECT.md",
    "ROADMAP.md",
    "TODO.md",
    "CHANGELOG.md",
    REPORT_PATH
];

test("le rapport final identifie la version, la date et le SHA de reference", () => {
    assert.equal(fs.existsSync(path.join(ROOT, REPORT_PATH)), true);
    assert.match(REPORT, /^# Rapport final d'audit — MeteoSignal v1\.4\.1$/m);
    assert.match(REPORT, /14 juillet 2026/);
    assert.match(REPORT, new RegExp(REFERENCE_SHA));
    assert.match(REPORT, /audit validé avec réserves/i);
});

test("la documentation distingue la version publique 1.5.2 de l'audit historique 1.4.1", () => {
    const packageVersion = JSON.parse(read("package.json")).version;
    const combined = KEY_DOCUMENTS.map(read).join("\n");

    assert.equal(packageVersion, "1.5.2");
    assert.match(read("config/config.js"), /version:\s*"1\.5\.2"/);
    assert.match(read("README.md"), /Version publique : 1\.5\.2/);
    assert.match(read("PROJECT.md"), /publié en version \*\*1\.5\.2\*\*/);
    assert.match(combined, /1\.4\.1/);
    assert.match(combined, /1\.5\.0/);
    assert.match(read("CHANGELOG.md"), /^## \[Unreleased\]$/m);
    assert.match(read("CHANGELOG.md"), /^## \[1\.4\.2\] - 2026-07-14$/m);
    assert.match(read("CHANGELOG.md"), /^## \[1\.5\.0\] - 2026-07-17$/m);
    assert.match(read("CHANGELOG.md"), /^## \[1\.5\.1\] - 2026-07-17$/m);
    assert.match(read("CHANGELOG.md"), /^## \[1\.5\.2\] - 2026-07-18$/m);
});

test("la roadmap et le TODO distinguent clôture technique et publication externe", () => {
    const roadmap = read("ROADMAP.md");
    const todo = read("TODO.md");

    assert.match(roadmap, /Publication Reliability & Documentation[\s\S]*Statut : terminée pour le socle Web v1\.4\.2/);
    assert.match(roadmap, /clôture technique validée avec réserves de validation physique/i);
    assert.match(todo, /\[x\] HTTPS public, accès direct au service worker et deux certificats Digital Asset Links/);
    assert.match(todo, /\[ \] Terminer le test fermé avec douze testeurs continus pendant quatorze jours/);
    assert.match(todo, /\[ \] Installer la version distribuée par Google Play/);
    assert.match(todo, /\[ \] Réaliser des parcours complets avec des lecteurs d'écran réels/);
});

test("le rapport conserve les deux certificats et le package Android exact", () => {
    assert.match(REPORT, /fr\.meteosignal\.app/);
    assert.match(REPORT, new RegExp(escapeRegExp(LOCAL_FINGERPRINT)));
    assert.match(REPORT, new RegExp(escapeRegExp(PLAY_FINGERPRINT)));
    assert.match(REPORT, /Google Digital Asset Links retourne publiquement deux associations/);
});

test("tous les liens documentaires locaux existent et aucun chemin Windows n'est publié", () => {
    const markdownFiles = listFiles(ROOT, (file) => file.endsWith(".md"));

    for (const file of markdownFiles) {
        const source = fs.readFileSync(file, "utf8");
        assert.doesNotMatch(source, /\b[A-Za-z]:[\\/]|file:\/\//i, file);

        for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
            const reference = match[1].trim().replace(/^<|>$/g, "");
            if (/^(?:[a-z]+:|#|\/\/)/i.test(reference)) {
                continue;
            }

            const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
            const target = path.resolve(path.dirname(file), pathname);
            assert.equal(fs.existsSync(target), true, `${path.relative(ROOT, file)}: ${reference}`);
        }
    }
});

test("la documentation de clôture ne contient aucun secret ou matériau de signature", () => {
    const combined = KEY_DOCUMENTS.map(read).join("\n");

    assert.doesNotMatch(combined, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
    assert.doesNotMatch(combined, /\b(?:password|mot de passe)\s*[:=]\s*\S+/i);
    assert.doesNotMatch(combined, /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/);
    assert.doesNotMatch(combined, /\bAIza[0-9A-Za-z_-]{30,}\b/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name === ".git" || entry.name === "node_modules") {
            return [];
        }

        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(target, predicate) : (predicate(target) ? [target] : []);
    });
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
