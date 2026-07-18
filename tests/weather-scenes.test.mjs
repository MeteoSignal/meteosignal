import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getWeatherCondition } from "../js/core/weather-codes.js";
import {
    WEATHER_SCENE_IDS,
    resolveWeatherScene
} from "../js/core/weather-scenes.js";
import {
    renderCurrentWeather,
    renderCurrentWeatherError,
    renderCurrentWeatherLoading
} from "../js/components/current-weather.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81];
const STORM_CODES = [82, 95, 96, 99];
const SNOW_CODES = [71, 73, 75, 77, 85, 86];

test("les codes degages distinguent strictement le jour et la nuit", () => {
    [0, 1].forEach((code) => {
        assert.equal(resolveWeatherScene(getWeatherCondition(code, true), true), "clear-day");
        assert.equal(resolveWeatherScene(getWeatherCondition(code, false), false), "clear-night");
    });
});

test("une valeur jour-nuit invalide ne suppose aucune scene claire", () => {
    const condition = getWeatherCondition(0, true);

    [undefined, null, 0, 1, "true", "false"].forEach((isDay) => {
        assert.equal(resolveWeatherScene(condition, isDay), "default");
    });
});

test("les codes nuageux restent identiques de jour et de nuit", () => {
    [2, 3].forEach((code) => {
        const condition = getWeatherCondition(code, true);
        assert.equal(resolveWeatherScene(condition, true), "cloudy");
        assert.equal(resolveWeatherScene(condition, false), "cloudy");
    });
});

test("les codes de brouillard produisent la scene fog", () => {
    [45, 48].forEach((code) => {
        assert.equal(resolveWeatherScene(getWeatherCondition(code), true), "fog");
    });
});

test("tous les codes rain actuels produisent la scene rain", () => {
    RAIN_CODES.forEach((code) => {
        assert.equal(resolveWeatherScene(getWeatherCondition(code), false), "rain");
    });
});

test("tous les codes storm actuels produisent la scene storm", () => {
    STORM_CODES.forEach((code) => {
        assert.equal(resolveWeatherScene(getWeatherCondition(code), false), "storm");
    });
});

test("tous les codes snow actuels produisent la scene snow", () => {
    SNOW_CODES.forEach((code) => {
        assert.equal(resolveWeatherScene(getWeatherCondition(code), false), "snow");
    });
});

test("les conditions absentes ou inconnues utilisent toujours default", () => {
    const fallbacks = [
        null,
        undefined,
        {},
        { tone: "" },
        { tone: "unknown" },
        { tone: "wind" },
        getWeatherCondition(999),
        getWeatherCondition(undefined)
    ];

    fallbacks.forEach((condition) => {
        assert.equal(resolveWeatherScene(condition, true), "default");
    });
});

test("le resolveur ne mute pas la condition et retourne uniquement une scene autorisee", () => {
    const condition = Object.freeze({ tone: "rain", nested: Object.freeze({ value: 1 }) });
    const snapshot = structuredClone(condition);

    assert.equal(resolveWeatherScene(condition, true), "rain");
    assert.deepEqual(condition, snapshot);

    [
        resolveWeatherScene({ tone: "clear" }, true),
        resolveWeatherScene({ tone: "clear" }, false),
        resolveWeatherScene({ tone: "cloudy" }, true),
        resolveWeatherScene({ tone: "rain" }, true),
        resolveWeatherScene({ tone: "storm" }, true),
        resolveWeatherScene({ tone: "snow" }, true),
        resolveWeatherScene({ tone: "fog" }, true),
        resolveWeatherScene(null, true)
    ].forEach((scene) => assert.ok(WEATHER_SCENE_IDS.includes(scene)));
    assert.equal(Object.isFrozen(WEATHER_SCENE_IDS), true);
});

test("le resolveur reste independant du DOM, du reseau et des chemins d'image", () => {
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;

    globalThis.fetch = () => {
        fetchCalls += 1;
        throw new Error("Le resolveur ne doit pas appeler le reseau.");
    };

    try {
        assert.equal(resolveWeatherScene({ tone: "storm" }, true), "storm");
        assert.equal(fetchCalls, 0);
    } finally {
        globalThis.fetch = originalFetch;
    }

    WEATHER_SCENE_IDS.forEach((scene) => {
        assert.doesNotMatch(scene, /[/.]|assets|webp|png|jpe?g/i);
    });

    const source = fs.readFileSync(path.join(ROOT, "js", "core", "weather-scenes.js"), "utf8");
    assert.doesNotMatch(source, /\b(?:document|window|fetch|XMLHttpRequest)\b/);
    assert.doesNotMatch(source, /assets|\.(?:webp|png|jpe?g|svg)/i);
});

test("le hero expose loading et error avec la scene default", () => {
    const harness = createHeroHarness();

    renderCurrentWeatherLoading({ name: "Toulouse" });
    assertHeroState(harness.hero, "loading", "unknown", "default", "true");

    renderCurrentWeatherError("Indisponible", { name: "Toulouse" });
    assertHeroState(harness.hero, "error", "unknown", "default", "false");
});

test("le hero applique chaque scene sans perdre data-weather-tone", () => {
    const harness = createHeroHarness();
    const cases = [
        [0, true, "clear", "clear-day"],
        [0, false, "clear", "clear-night"],
        [3, true, "cloudy", "cloudy"],
        [45, false, "fog", "fog"],
        [61, true, "rain", "rain"],
        [95, false, "storm", "storm"],
        [71, true, "snow", "snow"],
        [999, true, "unknown", "default"]
    ];

    cases.forEach(([code, isDay, tone, scene]) => {
        renderCurrentWeather(createWeather(code, isDay));
        assertHeroState(harness.hero, "ready", tone, scene, "false");
    });
});

test("plusieurs rendus successifs conservent uniquement le dernier etat", () => {
    const harness = createHeroHarness();

    renderCurrentWeather(createWeather(0, true));
    assert.equal(harness.hero.dataset.weatherScene, "clear-day");

    renderCurrentWeather(createWeather(95, true));
    assert.equal(harness.hero.dataset.weatherScene, "storm");

    renderCurrentWeather(createWeather(0, false));
    assert.equal(harness.hero.dataset.weatherScene, "clear-night");

    renderCurrentWeatherLoading();
    assertHeroState(harness.hero, "loading", "unknown", "default", "true");

    renderCurrentWeather(createWeather(3, true));
    assertHeroState(harness.hero, "ready", "cloudy", "cloudy", "false");

    renderCurrentWeatherError();
    assertHeroState(harness.hero, "error", "unknown", "default", "false");
});

test("le HTML initialise une scene default unique avec une image de fallback valide", () => {
    const source = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const heroTags = source.match(/<section[^>]+data-weather-hero[^>]*>/g) ?? [];
    const sceneImageTags = source.match(/<img[^>]+data-weather-scene-image[^>]*>/g) ?? [];

    assert.equal(heroTags.length, 1);
    assert.match(heroTags[0], /data-weather-state="loading"/);
    assert.match(heroTags[0], /data-weather-tone="unknown"/);
    assert.match(heroTags[0], /data-weather-scene="default"/);
    assert.match(heroTags[0], /data-weather-scene-status="fallback"/);
    assert.equal((source.match(/data-weather-scene=/g) ?? []).length, 1);
    assert.equal(sceneImageTags.length, 1);
    assert.match(sceneImageTags[0], /src="assets\/backgrounds\/meteosignal-lightning-bg\.webp"/);
    assert.match(sceneImageTags[0], /alt=""/);
    assert.match(sceneImageTags[0], /aria-hidden="true"/);
    assert.match(sceneImageTags[0], /decoding="async"/);
});

function createWeather(code, isDay) {
    return {
        location: { name: "Toulouse" },
        updatedAt: "2026-07-15T12:00:00.000Z",
        current: {
            temperature: 22,
            apparentTemperature: 21,
            isDay,
            condition: getWeatherCondition(code, isDay)
        },
        daily: [{ temperatureMin: 15, temperatureMax: 25 }]
    };
}

function assertHeroState(hero, state, tone, scene, busy) {
    assert.equal(hero.dataset.weatherState, state);
    assert.equal(hero.dataset.weatherTone, tone);
    assert.equal(hero.dataset.weatherScene, scene);
    assert.equal(hero.getAttribute("aria-busy"), busy);
}

function createHeroHarness() {
    const selectors = [
        "[data-weather-hero]",
        "#city",
        "#temp",
        "#description",
        "#hero-status",
        "#updated-at",
        "#icon",
        "#feels-like",
        "#temp-min",
        "#temp-max"
    ];
    const elements = new Map(selectors.map((selector) => [selector, new FakeElement()]));
    globalThis.document = {
        createElement: () => new FakeElement(),
        querySelector: (selector) => elements.get(selector) ?? null
    };

    return { hero: elements.get("[data-weather-hero]") };
}

class FakeElement {
    constructor() {
        this.attributes = new Map();
        this.children = [];
        this.className = "";
        this.dataset = {};
        this.textContent = "";
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    replaceChildren(...children) {
        this.children = children;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
}
