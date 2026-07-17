import test from "node:test";
import assert from "node:assert/strict";

import { createWeatherSceneLoader } from "../js/components/weather-scene-loader.js";

test("loading et default gardent le fallback sans requete d'image", async () => {
    const harness = createLoaderHarness();

    assert.equal(await harness.loader.update(harness.hero, "default", "loading"), false);
    assert.equal(await harness.loader.update(harness.hero, "default", "ready"), false);
    assert.equal(harness.images.length, 0);
    assert.equal(harness.hero.dataset.weatherSceneStatus, "fallback");
    assert.equal(harness.visibleImage.getAttribute("src"), null);
});

test("une scene prechargee remplace atomiquement l'image decorative", async () => {
    const harness = createLoaderHarness();
    const pending = harness.loader.update(harness.hero, "clear-day", "ready");
    const candidate = harness.images[0];

    assert.equal(harness.hero.dataset.weatherSceneStatus, "loading");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.visibleImage);
    assert.equal(harness.visibleImage.getAttribute("src"), null);
    assert.equal(candidate.getAttribute("src"), "/scenes/clear-day.webp");

    candidate.triggerLoad();

    assert.equal(await pending, true);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), candidate);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "clear-day");
    assert.equal(harness.hero.dataset.weatherSceneStatus, "ready");
    assert.equal(candidate.getAttribute("alt"), "");
    assert.equal(candidate.getAttribute("aria-hidden"), "true");
    assert.equal(candidate.getAttribute("decoding"), "async");
    assert.equal(candidate.getAttribute("loading"), "eager");
    assert.equal(candidate.getAttribute("fetchpriority"), "high");
    assert.equal(candidate.onload, null);
    assert.equal(candidate.onerror, null);
});

test("une scene deja affichee ne declenche aucune seconde requete", async () => {
    const harness = createLoaderHarness();
    const first = harness.loader.update(harness.hero, "rain", "ready");
    harness.images[0].triggerLoad();
    await first;

    assert.equal(await harness.loader.update(harness.hero, "rain", "ready"), true);
    assert.equal(harness.images.length, 1);
    assert.deepEqual(harness.requestedUrls, ["/scenes/rain.webp"]);
});

test("deux appels identiques pendant le chargement partagent la meme requete", async () => {
    const harness = createLoaderHarness();
    const first = harness.loader.update(harness.hero, "cloudy", "ready");
    const second = harness.loader.update(harness.hero, "cloudy", "ready");

    assert.equal(first, second);
    assert.equal(harness.images.length, 1);
    harness.images[0].triggerLoad();
    assert.equal(await second, true);
});

test("un changement reussi conserve l'ancienne image jusqu'au remplacement", async () => {
    const harness = createLoaderHarness();
    const first = harness.loader.update(harness.hero, "clear-day", "ready");
    harness.images[0].triggerLoad();
    await first;
    const displayedClear = harness.hero.querySelector("[data-weather-scene-image]");

    const second = harness.loader.update(harness.hero, "storm", "ready");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), displayedClear);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "clear-day");

    harness.images[1].triggerLoad();
    assert.equal(await second, true);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.images[1]);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "storm");
});

test("une reponse obsolete ne peut pas remplacer la scene la plus recente", async () => {
    const harness = createLoaderHarness();
    const oldRequest = harness.loader.update(harness.hero, "rain", "ready");
    const recentRequest = harness.loader.update(harness.hero, "snow", "ready");

    harness.images[0].triggerLoad();
    harness.images[1].triggerLoad();

    assert.equal(await oldRequest, false);
    assert.equal(await recentRequest, true);
    assert.equal(harness.images[0].getAttribute("src"), null);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "snow");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.images[1]);
});

test("storm reste visible lorsque clear-day termine apres la requete recente", async () => {
    const harness = createLoaderHarness();
    const oldRequest = harness.loader.update(harness.hero, "clear-day", "ready");
    const recentRequest = harness.loader.update(harness.hero, "storm", "ready");

    harness.images[1].triggerLoad();

    assert.equal(await recentRequest, true);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "storm");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.images[1]);

    harness.images[0].triggerLoad();

    assert.equal(await oldRequest, false);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "storm");
    assert.equal(harness.hero.dataset.weatherSceneStatus, "ready");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.images[1]);
    assert.equal(harness.hero.media.children.length, 1);
});

test("une image decorative absente est recreee une seule fois apres chargement", async () => {
    const harness = createLoaderHarness({ withVisibleImage: false });

    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), null);

    const pending = harness.loader.update(harness.hero, "fog", "ready");
    harness.images[0].triggerLoad();

    assert.equal(await pending, true);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.images[0]);
    assert.equal(harness.hero.media.children.length, 1);
    assert.equal(harness.images[0].getAttribute("src"), "/scenes/fog.webp");
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "fog");
    assert.equal(harness.hero.dataset.weatherSceneStatus, "ready");
});

test("une erreur initiale ne laisse aucune image cassee dans le DOM", async () => {
    const harness = createLoaderHarness();
    const pending = harness.loader.update(harness.hero, "fog", "ready");
    harness.images[0].triggerError();

    assert.equal(await pending, false);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.visibleImage);
    assert.equal(harness.visibleImage.getAttribute("src"), null);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, undefined);
    assert.equal(harness.hero.dataset.weatherSceneStatus, "error");
});

test("une erreur de changement conserve la derniere scene valide", async () => {
    const harness = createLoaderHarness();
    const first = harness.loader.update(harness.hero, "clear-night", "ready");
    harness.images[0].triggerLoad();
    await first;
    const previousImage = harness.hero.querySelector("[data-weather-scene-image]");

    const second = harness.loader.update(harness.hero, "storm", "ready");
    harness.images[1].triggerError();

    assert.equal(await second, false);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), previousImage);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "clear-night");
    assert.equal(harness.hero.dataset.weatherSceneStatus, "error");
});

test("un rejet de decode ne bloque pas une image deja chargee", async () => {
    const harness = createLoaderHarness({ rejectDecode: true });
    const pending = harness.loader.update(harness.hero, "snow", "ready");
    harness.images[0].triggerLoad();

    assert.equal(await pending, true);
    assert.equal(harness.images[0].decodeCalls, 1);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "snow");
});

test("loading conserve une scene valide et annule le chargement suivant", async () => {
    const harness = createLoaderHarness();
    const first = harness.loader.update(harness.hero, "cloudy", "ready");
    harness.images[0].triggerLoad();
    await first;
    const displayed = harness.hero.querySelector("[data-weather-scene-image]");

    const pending = harness.loader.update(harness.hero, "rain", "ready");
    assert.equal(await harness.loader.update(harness.hero, "default", "loading"), false);
    harness.images[1].triggerLoad();

    assert.equal(await pending, false);
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), displayed);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, "cloudy");
    assert.equal(harness.hero.dataset.weatherSceneStatus, "ready");
});

test("error et default reviennent au fallback et neutralisent une reponse tardive", async () => {
    const harness = createLoaderHarness();
    const pending = harness.loader.update(harness.hero, "storm", "ready");

    assert.equal(await harness.loader.update(harness.hero, "default", "error"), false);
    harness.images[0].triggerLoad();

    assert.equal(await pending, false);
    assert.equal(harness.hero.dataset.weatherSceneLoaded, undefined);
    assert.equal(harness.hero.dataset.weatherSceneStatus, "fallback");
    assert.equal(harness.hero.querySelector("[data-weather-scene-image]"), harness.visibleImage);
    assert.equal(harness.visibleImage.getAttribute("src"), null);
});

test("un hero absent ou une fabrique invalide echoue sans exception", async () => {
    const harness = createLoaderHarness();
    const invalidLoader = createWeatherSceneLoader({
        createImage: () => null,
        resolveAsset: (scene) => `/scenes/${scene}.webp`
    });

    assert.equal(await harness.loader.update(null, "rain", "ready"), false);
    assert.equal(await harness.loader.update({}, "rain", "ready"), false);
    assert.equal(await invalidLoader.update(harness.hero, "rain", "ready"), false);
    assert.equal(harness.hero.dataset.weatherSceneStatus, "error");
});

function createLoaderHarness({ rejectDecode = false, withVisibleImage = true } = {}) {
    const images = [];
    const requestedUrls = [];
    const hero = new FakeHero();
    const visibleImage = new FakeElement("img");
    visibleImage.className = "hero-scene-image";
    visibleImage.setAttribute("data-weather-scene-image", "");
    if (withVisibleImage) {
        hero.media.append(visibleImage);
    }
    const loader = createWeatherSceneLoader({
        createImage() {
            const image = new ControlledImage({ requestedUrls, rejectDecode });
            images.push(image);
            return image;
        },
        resolveAsset(scene) {
            return scene === "default" ? null : `/scenes/${scene}.webp`;
        }
    });

    return { hero, images, loader, requestedUrls, visibleImage };
}

class FakeElement {
    constructor(tagName) {
        this.attributes = new Map();
        this.children = [];
        this.className = "";
        this.dataset = {};
        this.parentElement = null;
        this.tagName = tagName;
    }

    append(child) {
        child.parentElement = this;
        this.children.push(child);
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    replaceWith(replacement) {
        const index = this.parentElement?.children.indexOf(this) ?? -1;

        if (index < 0) {
            return;
        }

        replacement.parentElement = this.parentElement;
        this.parentElement.children[index] = replacement;
        this.parentElement = null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
}

class FakeHero extends FakeElement {
    constructor() {
        super("section");
        this.media = new FakeElement("div");
        this.media.className = "hero-media";
        this.append(this.media);
    }

    querySelector(selector) {
        if (selector === ".hero-media") {
            return this.media;
        }

        if (selector === "[data-weather-scene-image]") {
            return this.media.children.find((child) => child.hasAttribute("data-weather-scene-image")) ?? null;
        }

        return null;
    }
}

class ControlledImage extends FakeElement {
    constructor({ requestedUrls, rejectDecode }) {
        super("img");
        this.complete = false;
        this.decodeCalls = 0;
        this.naturalWidth = 0;
        this.requestedUrls = requestedUrls;
        this.rejectDecode = rejectDecode;
        this.onload = null;
        this.onerror = null;
    }

    set src(value) {
        this.setAttribute("src", value);
        this.requestedUrls.push(value);
    }

    get src() {
        return this.getAttribute("src") ?? "";
    }

    decode() {
        this.decodeCalls += 1;
        return this.rejectDecode ? Promise.reject(new Error("decode indisponible")) : Promise.resolve();
    }

    triggerLoad() {
        this.complete = true;
        this.naturalWidth = 1600;
        this.onload?.();
    }

    triggerError() {
        this.complete = true;
        this.naturalWidth = 0;
        this.onerror?.();
    }
}
