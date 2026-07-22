import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZES = [16, 24, 32, 48, 64, 128, 192, 256, 512];

test("le pack officiel fournit les neuf tailles standard et maskable", () => {
    for (const variant of ["standard", "maskable"]) {
        for (const size of SIZES) {
            const relative = `assets/brand/exports/png/${variant}/meteosignal-${variant}-${size}.png`;
            assert.deepEqual(readPngDimensions(relative), { width: size, height: size }, relative);
        }
    }
});

test("le manifeste PWA fournit les deux usages aux tailles installables", () => {
    const manifest = JSON.parse(read("manifest.json"));
    const icons = new Map(manifest.icons.map((icon) => [`${icon.purpose}:${icon.sizes}`, icon.src]));

    assert.equal(manifest.id, "./");
    assert.equal(icons.get("any:192x192"), "assets/logo/icon-192.png");
    assert.equal(icons.get("any:512x512"), "assets/logo/icon-512.png");
    assert.equal(icons.get("maskable:192x192"), "assets/logo/icon-maskable-192.png");
    assert.equal(icons.get("maskable:512x512"), "assets/logo/icon-maskable-512.png");
});

test("les ressources Web et Windows ont leurs dimensions contractuelles", () => {
    const pngs = new Map([
        ["assets/logo/favicon-16.png", 16],
        ["assets/logo/favicon-32.png", 32],
        ["assets/logo/favicon-48.png", 48],
        ["assets/logo/apple-touch-icon-180.png", 180],
        ["assets/logo/icon-192.png", 192],
        ["assets/logo/icon-512.png", 512],
        ["assets/logo/icon-maskable-192.png", 192],
        ["assets/logo/icon-maskable-512.png", 512],
        ["assets/platform/windows/tile-70.png", 70],
        ["assets/platform/windows/tile-150.png", 150],
        ["assets/platform/windows/tile-310.png", 310]
    ]);

    for (const [file, size] of pngs) {
        assert.deepEqual(readPngDimensions(file), { width: size, height: size }, file);
    }

    assert.ok(readIcoImageCount("assets/logo/favicon.ico") >= 7);
    assert.ok(readIcoImageCount("assets/platform/windows/meteosignal.ico") >= 7);
});

test("Linux reçoit les neuf tailles hicolor sans format propriétaire", () => {
    for (const size of SIZES) {
        const relative = `assets/platform/linux/hicolor/${size}x${size}/apps/meteosignal.png`;
        assert.deepEqual(readPngDimensions(relative), { width: size, height: size }, relative);
    }
});

test("l'ecran a propos et les nouvelles icones utiles restent disponibles hors ligne", () => {
    const sw = read("sw.js");
    const expected = [
        "./a-propos.html",
        "./css/about.css",
        "./assets/logo/icon-maskable-192.png",
        "./assets/logo/apple-touch-icon-180.png",
        "./assets/logo/logo-meteosignal-complet.webp"
    ];

    for (const asset of expected) {
        assert.match(sw, new RegExp(escapeRegExp(`\"${asset}\"`)), asset);
    }

    const about = read("a-propos.html");
    assert.match(about, /MeteoSignal — Prévisions et alertes météo/);
    assert.match(about, /Version publique[\s\S]*1\.5\.5/);
    assert.match(read("index.html"), /href="a-propos\.html">À propos<\/a>/);
});

function read(relative) {
    return fs.readFileSync(path.join(ROOT, ...relative.split("/")), "utf8");
}

function readPngDimensions(relative) {
    const buffer = fs.readFileSync(path.join(ROOT, ...relative.split("/")));
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", relative);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readIcoImageCount(relative) {
    const buffer = fs.readFileSync(path.join(ROOT, ...relative.split("/")));
    assert.equal(buffer.readUInt16LE(0), 0, relative);
    assert.equal(buffer.readUInt16LE(2), 1, relative);
    return buffer.readUInt16LE(4);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
