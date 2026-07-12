import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".txt"]);
const LEGACY_ASSET_NAMES = [
    "logo-meteosignal-sans-slogan.png",
    "meteosignal-lightning-bg.png"
];

test("toutes les references textuelles vers une image locale existent", () => {
    const textFiles = listFiles(ROOT, (file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
    const references = new Set();

    for (const file of textFiles) {
        const source = fs.readFileSync(file, "utf8");

        for (const legacyName of LEGACY_ASSET_NAMES) {
            assert.equal(source.includes(legacyName), false, `${legacyName} reste reference dans ${file}`);
        }

        for (const match of source.matchAll(/assets\/[A-Za-z0-9._/-]+\.(?:avif|gif|jpe?g|png|svg|webp)/g)) {
            references.add(match[0]);
        }
    }

    assert.ok(references.size > 0);

    for (const reference of references) {
        assert.equal(fs.existsSync(path.join(ROOT, ...reference.split("/"))), true, reference);
    }
});

test("les dimensions des icones PWA correspondent au manifeste", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

    for (const icon of manifest.icons) {
        const file = path.join(ROOT, ...icon.src.split("/"));
        const [declaredWidth, declaredHeight] = icon.sizes.split("x").map(Number);
        const { width, height } = readPngDimensions(file);

        assert.equal(width, declaredWidth, icon.src);
        assert.equal(height, declaredHeight, icon.src);
    }
});

function readPngDimensions(file) {
    const buffer = fs.readFileSync(file);
    const pngSignature = "89504e470d0a1a0a";

    assert.equal(buffer.subarray(0, 8).toString("hex"), pngSignature, file);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20)
    };
}

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "tests") {
            return [];
        }

        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(target, predicate) : (predicate(target) ? [target] : []);
    });
}
