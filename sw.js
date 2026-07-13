const APP_VERSION = "1.4.1";
const CACHE_PREFIX = "meteosignal-static";
const CACHE_VERSION = `v${APP_VERSION}-p1d-storage-validation`;
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const WEATHER_API_HOSTS = new Set([
    "api.open-meteo.com",
    "geocoding-api.open-meteo.com",
    "air-quality-api.open-meteo.com"
]);

// One canonical URL per file. Versioned requests are matched with ignoreSearch.
const ESSENTIAL_ASSETS = [
    "./index.html",
    "./pwa.js",
    "./config/config.js",
    "./css/tokens.css",
    "./css/base.css",
    "./css/layout.css",
    "./css/components.css",
    "./css/responsive.css",
    "./js/clock.js",
    "./js/app.js",
    "./js/privacy-return.js",
    "./js/components/astronomy.js",
    "./js/components/current-weather.js",
    "./js/components/data-sources.js",
    "./js/components/daily-forecast.js",
    "./js/components/favorites.js",
    "./js/components/hourly-forecast.js",
    "./js/components/navigation.js",
    "./js/components/search.js",
    "./js/components/weather-alerts.js",
    "./js/components/weather-cards.js",
    "./js/core/formatters.js",
    "./js/core/location-search.js",
    "./js/core/moon.js",
    "./js/core/provenance.js",
    "./js/core/state.js",
    "./js/core/storage.js",
    "./js/core/weather-codes.js",
    "./js/core/weather-alerts.js",
    "./js/core/weather-icons.js",
    "./js/services/air-quality.service.js",
    "./js/services/geocoding.service.js",
    "./js/services/geolocation.service.js",
    "./js/services/openmeteo.service.js",
    "./js/services/weather-provider.js",
    "./js/services/weather-orchestrator.service.js"
];

const OPTIONAL_ASSETS = [
    "./confidentialite.html",
    "./manifest.json",
    "./assets/backgrounds/clear.jpg",
    "./assets/backgrounds/meteosignal-lightning-bg.webp",
    "./assets/backgrounds/night.jpg",
    "./assets/logo/icon-192.png",
    "./assets/logo/icon-512.png",
    "./assets/logo/icon-maskable-512.png",
    "./assets/logo/favicon-32.png",
    "./assets/logo/favicon-16.png",
    "./assets/logo/logo-meteosignal-sans-slogan.webp",
    "./assets/weather-icons/conditions/clear-day.svg",
    "./assets/weather-icons/conditions/clear-night.svg",
    "./assets/weather-icons/conditions/partly-cloudy-day.svg",
    "./assets/weather-icons/conditions/partly-cloudy-night.svg",
    "./assets/weather-icons/conditions/cloudy.svg",
    "./assets/weather-icons/conditions/light-rain-day.svg",
    "./assets/weather-icons/conditions/storm-day.svg",
    "./assets/weather-icons/conditions/fog-day.svg"
];

self.addEventListener("install", (event) => {
    event.waitUntil(installAppShell());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== STATIC_CACHE)
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);

    if (isWeatherApiRequest(requestUrl)) {
        event.respondWith(fetch(request));
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(handleNavigation(request));
        return;
    }

    if (requestUrl.origin === self.location.origin) {
        event.respondWith(handleStaticAsset(request));
    }
});

async function installAppShell() {
    const cache = await caches.open(STATIC_CACHE);

    try {
        await cache.addAll(ESSENTIAL_ASSETS);
    } catch (error) {
        await caches.delete(STATIC_CACHE);
        throw error;
    }

    const optionalResults = await Promise.allSettled(
        OPTIONAL_ASSETS.map((asset) => cache.add(asset))
    );

    optionalResults.forEach((result, index) => {
        if (result.status === "rejected") {
            console.warn(`Ressource PWA facultative non mise en cache : ${OPTIONAL_ASSETS[index]}`, result.reason);
        }
    });

    // Take control immediately only on the first installation. Updates stay waiting.
    if (!self.registration.active) {
        await self.skipWaiting();
    }
}

async function handleNavigation(request) {
    try {
        // Preserve every HTTP response, including 404 and 5xx.
        return await fetch(request);
    } catch (error) {
        const cache = await caches.open(STATIC_CACHE);
        const cachedPage = await cache.match(request, { ignoreSearch: true });

        if (cachedPage) {
            return cachedPage;
        }

        const cachedAppShell = await cache.match("./index.html");
        return cachedAppShell ?? createOfflineResponse();
    }
}

async function handleStaticAsset(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request, { ignoreSearch: true });

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        return await fetch(request);
    } catch (error) {
        return new Response("", {
            status: 504,
            statusText: "Ressource indisponible hors ligne"
        });
    }
}

function isWeatherApiRequest(url) {
    return WEATHER_API_HOSTS.has(url.hostname);
}

function createOfflineResponse() {
    return new Response(
        "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><title>MeteoSignal</title></head><body><main><h1>MeteoSignal</h1><p>L'application est disponible hors ligne, mais les donnees meteo necessitent une connexion.</p></main></body></html>",
        {
            headers: {
                "Content-Type": "text/html; charset=utf-8"
            }
        }
    );
}
