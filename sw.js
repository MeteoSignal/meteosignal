const CACHE_PREFIX = "meteosignal-static";
const CACHE_VERSION = "v1.1.3-build-date-automation";
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const WEATHER_API_HOSTS = new Set([
    "api.open-meteo.com",
    "geocoding-api.open-meteo.com",
    "air-quality-api.open-meteo.com"
]);

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./pwa.js",
    "./config/config.js",
    "./config/config.js?v=1.1.3-build-date-automation",
    "./css/style.css",
    "./css/style.css?v=1.1.3-build-date-automation",
    "./css/tokens.css",
    "./css/tokens.css?v=1.1.3-build-date-automation",
    "./css/base.css",
    "./css/base.css?v=1.1.3-build-date-automation",
    "./css/layout.css",
    "./css/layout.css?v=1.1.3-build-date-automation",
    "./css/components.css",
    "./css/components.css?v=1.1.3-build-date-automation",
    "./css/responsive.css",
    "./css/responsive.css?v=1.1.3-build-date-automation",
    "./js/clock.js",
    "./js/app.js",
    "./js/app.js?v=1.1.3-build-date-automation",
    "./js/components/astronomy.js",
    "./js/components/current-weather.js",
    "./js/components/daily-forecast.js",
    "./js/components/favorites.js",
    "./js/components/hourly-forecast.js",
    "./js/components/navigation.js",
    "./js/components/navigation.js?v=1.1.3-build-date-automation",
    "./js/components/search.js",
    "./js/components/weather-cards.js",
    "./js/core/formatters.js",
    "./js/core/moon.js",
    "./js/core/state.js",
    "./js/core/storage.js",
    "./js/core/weather-codes.js",
    "./js/core/weather-codes.js?v=1.1.3-build-date-automation",
    "./js/services/air-quality.service.js",
    "./js/services/geocoding.service.js",
    "./js/services/geolocation.service.js",
    "./js/services/openmeteo.service.js",
    "./js/services/weather-provider.js",
    "./assets/backgrounds/clear.jpg",
    "./assets/backgrounds/meteosignal-lightning-bg.webp",
    "./assets/backgrounds/night.jpg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/maskable-512.png",
    "./assets/icons/sun.svg",
    "./assets/logo/icon-192.png",
    "./assets/logo/icon-512.png",
    "./assets/logo/favicon-32.png",
    "./assets/logo/favicon-16.png",
    "./assets/logo/logo-meteosignal-sans-slogan.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
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

async function handleNavigation(request) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            return response;
        }
    } catch (error) {
        // The cached app shell takes over; weather data remains network-only.
    }

    const cachedPage = await caches.match("./index.html");
    return cachedPage ?? createOfflineResponse();
}

async function handleStaticAsset(request) {
    const cachedResponse = await caches.match(request);

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
