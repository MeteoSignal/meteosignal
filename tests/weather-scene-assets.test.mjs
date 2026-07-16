import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveWeatherSceneAsset } from "../js/core/weather-scene-assets.js";
import { WEATHER_SCENES } from "../js/core/weather-scenes.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HERO_ASSET_DIRECTORY = path.join(ROOT, "assets", "backgrounds", "hero");
const MAX_SCENE_BYTES = 200 * 1024;
const EXPECTED_SCENES = new Map([
    [WEATHER_SCENES.CLEAR_DAY, "hero-clear-day.webp"],
    [WEATHER_SCENES.CLEAR_NIGHT, "hero-clear-night.webp"],
    [WEATHER_SCENES.CLOUDY, "hero-cloudy.webp"],
    [WEATHER_SCENES.RAIN, "hero-rain.webp"],
    [WEATHER_SCENES.STORM, "hero-storm.webp"],
    [WEATHER_SCENES.SNOW, "hero-snow.webp"],
    [WEATHER_SCENES.FOG, "hero-fog.webp"]
]);

test("le registre associe exactement une ressource locale aux sept scenes immersives", () => {
    const resolvedFilenames = [];

    assert.equal(EXPECTED_SCENES.size, 7);

    for (const [scene, filename] of EXPECTED_SCENES) {
        const assetUrl = new URL(resolveWeatherSceneAsset(scene));

        assert.equal(assetUrl.protocol, "file:");
        assert.equal(assetUrl.search, "");
        assert.equal(assetUrl.hash, "");
        assert.equal(path.extname(fileURLToPath(assetUrl)), ".webp");
        assert.equal(path.basename(fileURLToPath(assetUrl)), filename);
        assert.equal(fs.existsSync(fileURLToPath(assetUrl)), true, filename);
        resolvedFilenames.push(path.basename(fileURLToPath(assetUrl)));
    }

    assert.deepEqual(resolvedFilenames.sort(), [...EXPECTED_SCENES.values()].sort());

    assert.equal(resolveWeatherSceneAsset(WEATHER_SCENES.DEFAULT), null);
    assert.equal(resolveWeatherSceneAsset("unknown"), null);
    assert.equal(resolveWeatherSceneAsset(null), null);
    assert.equal(resolveWeatherSceneAsset(undefined), null);
});

test("le dossier contient uniquement sept WebP 1600x900 lisibles sous 200 Kio", () => {
    const files = fs.readdirSync(HERO_ASSET_DIRECTORY).sort();
    const expectedFiles = [...EXPECTED_SCENES.values()].sort();

    assert.deepEqual(files, expectedFiles);

    for (const filename of files) {
        const file = path.join(HERO_ASSET_DIRECTORY, filename);
        const buffer = fs.readFileSync(file);
        const dimensions = readWebpDimensions(buffer);

        assert.equal(path.extname(filename), ".webp");
        assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF", filename);
        assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP", filename);
        assert.deepEqual(dimensions, { width: 1600, height: 900 }, filename);
        assert.ok(buffer.length < MAX_SCENE_BYTES, `${filename}: ${buffer.length} octets`);
    }
});

test("les chemins d'images restent centralises hors du HTML et du CSS", () => {
    const resolverSource = read("js/core/weather-scene-assets.js");
    const htmlSource = read("index.html");
    const layoutSource = read("css/layout.css");
    const responsiveSource = read("css/responsive.css");
    const serviceWorkerSource = read("sw.js");

    assert.doesNotMatch(resolverSource, /https?:\/\//i);
    assert.doesNotMatch(resolverSource, /(?:clear|night)\.jpg/i);
    assert.equal((resolverSource.match(/hero-[a-z-]+\.webp/g) ?? []).length, 7);

    for (const filename of EXPECTED_SCENES.values()) {
        assert.equal(countOccurrences(resolverSource, filename), 1, filename);
        assert.equal(htmlSource.includes(filename), false, filename);
        assert.equal(layoutSource.includes(filename), false, filename);
        assert.equal(responsiveSource.includes(filename), false, filename);
        assert.equal(serviceWorkerSource.includes(filename), false, filename);
    }

    assert.doesNotMatch(layoutSource, /assets\/backgrounds\/(?:clear|night)\.jpg/);
    assert.match(layoutSource, /\.hero-media\s*\{[\s\S]*?radial-gradient/);
    assert.match(layoutSource, /\.hero-scene-image\s*\{[\s\S]*?object-fit:\s*cover/);
    assert.match(layoutSource, /\.hero-media::after\s*\{[\s\S]*?linear-gradient/);
    assert.match(layoutSource, /\.hero-content\s*\{[\s\S]*?z-index:\s*2/);
    assert.match(layoutSource, /\.hero-weather\s*\{[\s\S]*?min-height:\s*31rem/);
    assert.match(read("css/base.css"), /@media \(prefers-reduced-motion: reduce\)/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, ...relativePath.split("/")), "utf8");
}

function countOccurrences(source, value) {
    return source.split(value).length - 1;
}

function readWebpDimensions(buffer) {
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");

    let offset = 12;

    while (offset + 8 <= buffer.length) {
        const chunkType = buffer.subarray(offset, offset + 4).toString("ascii");
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const payload = offset + 8;

        if (chunkType === "VP8 ") {
            assert.equal(buffer.subarray(payload + 3, payload + 6).toString("hex"), "9d012a");
            return {
                width: buffer.readUInt16LE(payload + 6) & 0x3fff,
                height: buffer.readUInt16LE(payload + 8) & 0x3fff
            };
        }

        if (chunkType === "VP8L") {
            assert.equal(buffer[payload], 0x2f);
            const bits = buffer.readUInt32LE(payload + 1);
            return {
                width: (bits & 0x3fff) + 1,
                height: ((bits >>> 14) & 0x3fff) + 1
            };
        }

        if (chunkType === "VP8X") {
            return {
                width: 1 + readUInt24LE(buffer, payload + 4),
                height: 1 + readUInt24LE(buffer, payload + 7)
            };
        }

        offset = payload + chunkSize + (chunkSize % 2);
    }

    throw new Error("Dimensions WebP introuvables.");
}

function readUInt24LE(buffer, offset) {
    return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}
