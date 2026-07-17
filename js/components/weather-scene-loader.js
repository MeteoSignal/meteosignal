import { resolveWeatherSceneAsset } from "../core/weather-scene-assets.js?v=1.5.1-release";

const SCENE_IMAGE_SELECTOR = "[data-weather-scene-image]";
const HERO_MEDIA_SELECTOR = ".hero-media";

export function createWeatherSceneLoader({
    createImage = createNativeImage,
    resolveAsset = resolveWeatherSceneAsset
} = {}) {
    const states = new WeakMap();

    function update(hero, scene, weatherState) {
        if (!hero || typeof hero.querySelector !== "function") {
            return Promise.resolve(false);
        }

        const state = getLoaderState(states, hero);

        if (weatherState === "loading") {
            invalidatePendingRequest(state);
            hero.dataset.weatherSceneStatus = hasLoadedScene(hero) ? "ready" : "fallback";
            return Promise.resolve(false);
        }

        if (weatherState !== "ready") {
            resetToFallback(hero, state);
            return Promise.resolve(false);
        }

        let assetUrl;

        try {
            assetUrl = resolveAsset(scene);
        } catch {
            invalidatePendingRequest(state);
            hero.dataset.weatherSceneStatus = "error";
            return Promise.resolve(false);
        }

        if (!assetUrl) {
            resetToFallback(hero, state);
            return Promise.resolve(false);
        }

        if (isSceneDisplayed(hero, scene)) {
            invalidatePendingRequest(state);
            hero.dataset.weatherSceneStatus = "ready";
            return Promise.resolve(true);
        }

        if (state.pendingScene === scene && state.pendingPromise) {
            return state.pendingPromise;
        }

        invalidatePendingRequest(state);
        const requestId = state.requestId;
        hero.dataset.weatherSceneStatus = "loading";

        let candidate;

        try {
            candidate = createImage();
            prepareSceneImage(candidate);
        } catch {
            hero.dataset.weatherSceneStatus = "error";
            return Promise.resolve(false);
        }

        const request = loadImage(candidate, assetUrl);
        state.pendingScene = scene;
        state.cancelPending = request.cancel;

        const pendingPromise = request.promise
            .then(async (result) => {
                if (result === "loaded") {
                    await decodeImage(candidate);
                }

                if (state.requestId !== requestId) {
                    return false;
                }

                if (result !== "loaded" || !replaceVisibleImage(hero, candidate)) {
                    hero.dataset.weatherSceneStatus = "error";
                    return false;
                }

                hero.dataset.weatherSceneLoaded = scene;
                hero.dataset.weatherSceneStatus = "ready";
                return true;
            })
            .catch(() => {
                if (state.requestId === requestId) {
                    hero.dataset.weatherSceneStatus = "error";
                }

                return false;
            })
            .finally(() => {
                if (state.requestId === requestId) {
                    state.pendingScene = null;
                    state.pendingPromise = null;
                    state.cancelPending = null;
                }
            });

        state.pendingPromise = pendingPromise;
        return pendingPromise;
    }

    return Object.freeze({ update });
}

const defaultLoader = createWeatherSceneLoader();

export function updateHeroWeatherScene(hero, scene, weatherState) {
    return defaultLoader.update(hero, scene, weatherState);
}

function createNativeImage() {
    return new Image();
}

function getLoaderState(states, hero) {
    let state = states.get(hero);

    if (!state) {
        state = {
            requestId: 0,
            pendingScene: null,
            pendingPromise: null,
            cancelPending: null
        };
        states.set(hero, state);
    }

    return state;
}

function invalidatePendingRequest(state) {
    state.requestId += 1;
    state.cancelPending?.();
    state.pendingScene = null;
    state.pendingPromise = null;
    state.cancelPending = null;
}

function resetToFallback(hero, state) {
    invalidatePendingRequest(state);
    const image = hero.querySelector(SCENE_IMAGE_SELECTOR);
    image?.removeAttribute?.("src");
    delete hero.dataset.weatherSceneLoaded;
    hero.dataset.weatherSceneStatus = "fallback";
}

function hasLoadedScene(hero) {
    return Boolean(hero.dataset.weatherSceneLoaded && getImageSource(hero.querySelector(SCENE_IMAGE_SELECTOR)));
}

function isSceneDisplayed(hero, scene) {
    return hero.dataset.weatherSceneLoaded === scene
        && Boolean(getImageSource(hero.querySelector(SCENE_IMAGE_SELECTOR)));
}

function getImageSource(image) {
    return image?.getAttribute?.("src") ?? null;
}

function prepareSceneImage(image) {
    if (!image || typeof image.setAttribute !== "function") {
        throw new TypeError("Fabrique d'image invalide.");
    }

    image.className = "hero-scene-image";
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    image.fetchPriority = "high";
    image.setAttribute("alt", "");
    image.setAttribute("aria-hidden", "true");
    image.setAttribute("data-weather-scene-image", "");
    image.setAttribute("decoding", "async");
    image.setAttribute("loading", "eager");
    image.setAttribute("fetchpriority", "high");
}

function loadImage(image, assetUrl) {
    let settled = false;
    let settleRequest;

    const promise = new Promise((resolve) => {
        settleRequest = (result) => {
            if (settled) {
                return;
            }

            settled = true;
            image.onload = null;
            image.onerror = null;
            resolve(result);
        };

        image.onload = () => settleRequest("loaded");
        image.onerror = () => settleRequest("error");
        image.src = assetUrl;

        if (image.complete) {
            queueMicrotask(() => settleRequest(image.naturalWidth > 0 ? "loaded" : "error"));
        }
    });

    return {
        promise,
        cancel: () => {
            settleRequest("cancelled");
            image.removeAttribute?.("src");
        }
    };
}

async function decodeImage(image) {
    if (typeof image.decode !== "function") {
        return;
    }

    try {
        await image.decode();
    } catch {
        // L'événement load reste la source de vérité lorsque decode() est indisponible ou rejeté.
    }
}

function replaceVisibleImage(hero, candidate) {
    const current = hero.querySelector(SCENE_IMAGE_SELECTOR);

    if (current?.replaceWith) {
        current.replaceWith(candidate);
        return true;
    }

    const media = hero.querySelector(HERO_MEDIA_SELECTOR);

    if (!media?.append) {
        return false;
    }

    media.append(candidate);
    return true;
}
