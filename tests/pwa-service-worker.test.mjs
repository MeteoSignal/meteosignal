import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW_SOURCE = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const DEPLOYMENT_REVISION = "1.5.2-location-sync";
const LEGACY_DEPLOYMENT_MARKERS = ["immersive-dashboard-p6d", "immersive-dashboard-p6f", "w3c-feedback"];
const LEGACY_HERO_ASSETS = [
    "./assets/backgrounds/clear.jpg",
    "./assets/backgrounds/night.jpg"
];
const IMMERSIVE_HERO_FILENAMES = [
    "hero-clear-day.webp",
    "hero-clear-night.webp",
    "hero-cloudy.webp",
    "hero-rain.webp",
    "hero-storm.webp",
    "hero-snow.webp",
    "hero-fog.webp"
];

test("le precache contient une seule URL canonique par fichier local", () => {
    const { api } = createServiceWorkerHarness();
    const assets = [...api.ESSENTIAL_ASSETS, ...api.OPTIONAL_ASSETS];
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

    assert.equal(api.ESSENTIAL_ASSETS.length, 40);
    assert.equal(api.OPTIONAL_ASSETS.length, 18);
    assert.equal(assets.length, 58);
    assert.equal(new Set(assets).size, assets.length);
    assert.equal(assets.some((asset) => asset.includes("open-meteo.com")), false);
    assert.equal(assets.includes("./assets/logo/logo-meteosignal-sans-slogan.webp"), true);
    assert.equal(assets.includes("./assets/logo/logo-meteosignal-sans-slogan.png"), false);
    assert.equal(assets.includes("./css/style.css"), false);
    assert.equal(assets.includes("./css/privacy.css"), true);
    assert.equal(api.ESSENTIAL_ASSETS.includes("./js/components/current-weather.js"), true);
    assert.equal(api.ESSENTIAL_ASSETS.includes("./js/components/weather-scene-loader.js"), true);
    assert.equal(api.ESSENTIAL_ASSETS.includes("./js/core/weather-scene-assets.js"), true);
    assert.equal(api.ESSENTIAL_ASSETS.includes("./js/core/weather-scenes.js"), true);
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");

    for (const asset of LEGACY_HERO_ASSETS) {
        assert.equal(api.ESSENTIAL_ASSETS.includes(asset), false, asset);
        assert.equal(api.OPTIONAL_ASSETS.includes(asset), false, asset);
    }

    for (const filename of IMMERSIVE_HERO_FILENAMES) {
        assert.equal(assets.some((asset) => asset.includes(filename)), false, filename);
    }

    for (const asset of assets) {
        assert.match(asset, /^\.\//);
        assert.equal(asset.includes("?"), false, asset);
        assert.equal(fs.existsSync(path.join(ROOT, asset.slice(2))), true, asset);
    }
});

test("le precache utilise les cles versionnees exactes et force le rechargement HTTP", async () => {
    const harness = createServiceWorkerHarness({ active: true });

    await harness.api.installAppShell();

    assert.equal(harness.addAllCalls.length, 1);
    assert.equal(harness.addAllCalls[0].length, harness.api.ESSENTIAL_ASSETS.length);
    assert.equal(harness.addCalls.length, harness.api.OPTIONAL_ASSETS.length);

    harness.addAllCalls[0].forEach((request, index) => {
        assert.equal(request.cache, "reload");
        assert.equal(request.url, expectedPrecacheUrl(harness.api.ESSENTIAL_ASSETS[index]));
    });
    harness.addCalls.forEach((request, index) => {
        assert.equal(request.cache, "reload");
        assert.equal(request.url, expectedPrecacheUrl(harness.api.OPTIONAL_ASSETS[index]));
    });
});

test("chaque import JavaScript local du socle reste disponible hors ligne", () => {
    const { api } = createServiceWorkerHarness();
    const essentialAssets = new Set(api.ESSENTIAL_ASSETS);
    const essentialModules = api.ESSENTIAL_ASSETS.filter((asset) => asset.endsWith(".js"));

    for (const moduleAsset of essentialModules) {
        const moduleFile = path.join(ROOT, moduleAsset.slice(2));
        const moduleSource = fs.readFileSync(moduleFile, "utf8");

        for (const specifier of readStaticModuleSpecifiers(moduleSource)) {
            if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
                continue;
            }

            const dependency = specifier.split(/[?#]/, 1)[0];
            const dependencyFile = path.resolve(path.dirname(moduleFile), dependency);
            const dependencyAsset = `./${path.relative(ROOT, dependencyFile).split(path.sep).join("/")}`;

            assert.equal(fs.existsSync(dependencyFile), true, `${moduleAsset} -> ${specifier}`);
            assert.equal(essentialAssets.has(dependencyAsset), true, `${moduleAsset} -> ${dependencyAsset}`);
        }
    }
});

test("la version applicative, le cache et tous les cache-busters restent coherents", () => {
    const { api } = createServiceWorkerHarness();
    const packageVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
    const configSource = fs.readFileSync(path.join(ROOT, "config", "config.js"), "utf8");
    const indexSource = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const configVersion = configSource.match(/version:\s*"(\d+\.\d+\.\d+)"/)?.[1];
    const versionedSources = [
        path.join(ROOT, "index.html"),
        path.join(ROOT, "sw.js"),
        ...listFiles(path.join(ROOT, "css"), (file) => file.endsWith(".css")),
        ...listFiles(path.join(ROOT, "js"), (file) => file.endsWith(".js"))
    ];
    const cacheBusterVersions = versionedSources.flatMap((file) => (
        [...fs.readFileSync(file, "utf8").matchAll(/\?v=v?(\d+\.\d+\.\d+)/g)]
            .map((match) => match[1])
    ));

    assert.equal(api.APP_VERSION, packageVersion);
    assert.equal(configVersion, packageVersion);
    assert.equal(api.DEPLOYMENT_REVISION, DEPLOYMENT_REVISION);
    assert.equal(api.CACHE_VERSION, `v${DEPLOYMENT_REVISION}`);
    assert.match(indexSource, new RegExp(`src="js/clock\\.js\\?v=${escapeRegExp(DEPLOYMENT_REVISION)}"`));
    assert.match(indexSource, new RegExp(`src="js/app\\.js\\?v=${escapeRegExp(DEPLOYMENT_REVISION)}"`));
    assert.match(api.CACHE_VERSION, new RegExp(`^v${escapeRegExp(packageVersion)}(?:-|$)`));
    assert.ok(cacheBusterVersions.length > 0);
    assert.deepEqual(new Set(cacheBusterVersions), new Set([packageVersion]));
});

test("la revision de release est unique dans tous les fichiers servis", () => {
    const servedFiles = [
        path.join(ROOT, "index.html"),
        path.join(ROOT, "confidentialite.html"),
        path.join(ROOT, "pwa.js"),
        path.join(ROOT, "sw.js"),
        ...listFiles(path.join(ROOT, "css"), (file) => file.endsWith(".css")),
        ...listFiles(path.join(ROOT, "js"), (file) => file.endsWith(".js"))
    ];
    const servedSource = servedFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");

    for (const marker of LEGACY_DEPLOYMENT_MARKERS) {
        assert.doesNotMatch(servedSource, new RegExp(escapeRegExp(marker)), marker);
    }

    for (const file of listFiles(path.join(ROOT, "js"), (target) => target.endsWith(".js"))) {
        const source = fs.readFileSync(file, "utf8");
        for (const specifier of readStaticModuleSpecifiers(source).filter((value) => value.startsWith("."))) {
            assert.equal(specifier.match(/\?v=([^#]+)/)?.[1], DEPLOYMENT_REVISION, `${file}: ${specifier}`);
        }
    }

    assert.match(servedSource, new RegExp(escapeRegExp(DEPLOYMENT_REVISION)));
});

test("une ressource essentielle manquante annule proprement l'installation", async () => {
    const essentialError = new Error("socle indisponible");
    const harness = createServiceWorkerHarness({ essentialError, active: false });

    await assert.rejects(harness.api.installAppShell(), essentialError);
    assert.deepEqual(harness.deletedCaches, [harness.api.STATIC_CACHE]);
    assert.equal(harness.skipWaitingCalls.length, 0);
});

test("une ressource facultative manquante n'annule pas une premiere installation", async () => {
    const missingAsset = "./manifest.json";
    const harness = createServiceWorkerHarness({
        active: false,
        optionalErrors: new Map([[expectedPrecacheUrl(missingAsset), new Error("facultatif indisponible")]])
    });

    await harness.api.installAppShell();

    assert.equal(harness.addAllCalls.length, 1);
    assert.deepEqual(
        Array.from(harness.addAllCalls[0], (request) => request.url),
        Array.from(harness.api.ESSENTIAL_ASSETS, expectedPrecacheUrl)
    );
    assert.equal(harness.addCalls.length, harness.api.OPTIONAL_ASSETS.length);
    assert.equal(harness.skipWaitingCalls.length, 1);
    assert.equal(harness.warnings.length, 1);
    assert.match(harness.warnings[0][0], /manifest\.json/);
});

test("une mise a jour complete prend le relais sans conserver les anciens onglets", async () => {
    const harness = createServiceWorkerHarness({ active: true });

    await harness.api.installAppShell();

    assert.equal(harness.skipWaitingCalls.length, 1);
    assert.ok(harness.operations.indexOf("precache-essential-complete") < harness.operations.indexOf("skip-waiting"));
});

test("la navigation conserve les reponses HTTP et ne replie qu'en erreur reseau", async () => {
    const online200 = new Response("accueil", { status: 200 });
    const successHarness = createServiceWorkerHarness({ fetchImpl: async () => online200 });
    assert.equal(
        await successHarness.api.handleNavigation({ url: "https://example.test/app/" }),
        online200
    );

    const online404 = new Response("introuvable", { status: 404 });
    const onlineHarness = createServiceWorkerHarness({ fetchImpl: async () => online404 });
    const onlineResult = await onlineHarness.api.handleNavigation({ url: "https://example.test/inconnue" });

    assert.equal(onlineResult, online404);
    assert.equal(onlineResult.status, 404);

    const cachedPage = new Response("page en cache");
    const offlineHarness = createServiceWorkerHarness({
        fetchImpl: async () => { throw new TypeError("hors ligne"); },
        matches: new Map([["https://example.test/app/?v=1.4.1", cachedPage]])
    });
    const offlineResult = await offlineHarness.api.handleNavigation({
        url: "https://example.test/app/?v=1.4.1"
    });

    assert.equal(offlineResult, cachedPage);
    assert.equal(offlineHarness.matchOptions[0].ignoreSearch, true);
});

test("une navigation hors ligne inconnue sert index.html depuis le cache courant", async () => {
    const appShell = new Response("application hors ligne");
    const harness = createServiceWorkerHarness({
        fetchImpl: async () => { throw new TypeError("hors ligne"); },
        matches: new Map([["./index.html", appShell]])
    });

    const result = await harness.api.handleNavigation({ url: "https://example.test/app/route" });

    assert.equal(result, appShell);
    assert.deepEqual(harness.matchRequests, ["https://example.test/app/route", "./index.html"]);
});

test("les ressources statiques respectent exactement la revision demandee", async () => {
    const cachedAsset = new Response("cache");
    const releaseUrl = `https://example.test/app/app.js?v=${DEPLOYMENT_REVISION}`;
    const cachedHarness = createServiceWorkerHarness({
        matches: new Map([[releaseUrl, cachedAsset]])
    });
    const cachedResult = await cachedHarness.api.handleStaticAsset({
        url: releaseUrl
    });

    assert.equal(cachedResult, cachedAsset);
    assert.equal(cachedHarness.matchOptions[0], undefined);

    const oldRevisionUrl = "https://example.test/app/app.js?v=1.4.2-immersive-dashboard-p6d";
    const oldRevisionHarness = createServiceWorkerHarness({
        matches: new Map([[releaseUrl, cachedAsset]]),
        fetchImpl: async () => new Response("ancienne URL demandee au reseau")
    });
    const oldRevisionResult = await oldRevisionHarness.api.handleStaticAsset({ url: oldRevisionUrl });

    assert.equal(await oldRevisionResult.text(), "ancienne URL demandee au reseau");
    assert.deepEqual(oldRevisionHarness.matchRequests, [oldRevisionUrl]);

    const online404 = new Response("absent", { status: 404 });
    const onlineHarness = createServiceWorkerHarness({ fetchImpl: async () => online404 });
    assert.equal(await onlineHarness.api.handleStaticAsset({ url: "https://example.test/absent.js" }), online404);

    const offlineHarness = createServiceWorkerHarness({
        fetchImpl: async () => { throw new TypeError("hors ligne"); }
    });
    const offlineResult = await offlineHarness.api.handleStaticAsset({ url: "https://example.test/absent.js" });
    assert.equal(offlineResult.status, 504);
    assert.equal((SW_SOURCE.match(/ignoreSearch:\s*true/g) ?? []).length, 1);
    assert.match(SW_SOURCE, /Navigation only:[^\n]+\n\s*const cachedPage = await cache\.match\(request, \{ ignoreSearch: true \}\);/);
});

test("le service worker ne supprime jamais les favoris ni le stockage local", () => {
    assert.doesNotMatch(SW_SOURCE, /localStorage|sessionStorage|meteosignal\.favorites|indexedDB/);
});

test("les trois familles d'appels Open-Meteo restent network-only et hors Cache Storage", async () => {
    const apiHosts = [
        "api.open-meteo.com",
        "air-quality-api.open-meteo.com",
        "geocoding-api.open-meteo.com"
    ];
    const harness = createServiceWorkerHarness({
        fetchImpl: async (request) => new Response(request.url)
    });

    for (const hostname of apiHosts) {
        let responsePromise;
        const request = {
            method: "GET",
            mode: "cors",
            url: `https://${hostname}/v1/test`
        };

        harness.events.get("fetch")({
            request,
            respondWith(value) {
                responsePromise = value;
            }
        });

        assert.equal(await (await responsePromise).text(), request.url);
    }

    assert.equal(harness.matchRequests.length, 0);
    assert.equal(harness.openedCaches.length, 0);
    assert.equal(harness.addAllCalls.length, 0);
    assert.equal(harness.addCalls.length, 0);
    assert.doesNotMatch(SW_SOURCE, /\bcache\.put\s*\(/);
});

test("l'activation supprime seulement les anciens caches MeteoSignal", async () => {
    const harness = createServiceWorkerHarness({
        cacheNames: [
            "meteosignal-static-v1.4.0",
            "meteosignal-static-v1.4.1-pwa-reliability",
            "meteosignal-static-v1.4.1-p1b-assets",
            "meteosignal-static-v1.4.1-p1b2-css-loading",
            "meteosignal-static-v1.4.1-p1b2-weather-cancellation",
            "autre-application",
            "meteosignal-static-v1.4.1-p1b2-runtime-efficiency",
            "meteosignal-static-v1.4.1-p1c-focus-visibility",
            "meteosignal-static-v1.4.1-p1c-favorite-focus",
            "meteosignal-static-v1.4.1-p1c-live-semantics",
            "meteosignal-static-v1.4.1-p1c-semantic-structure",
            "meteosignal-static-v1.4.1-p1c-final-accessibility",
            "meteosignal-static-v1.4.1-p1d-search-privacy",
            "meteosignal-static-v1.4.1-p1d-storage-validation",
            "meteosignal-static-v1.4.1-p1d-api-cache-privacy"
        ]
    });
    let activation;

    harness.events.get("activate")({ waitUntil(value) { activation = value; } });
    await activation;

    assert.deepEqual(harness.deletedCaches, [
        "meteosignal-static-v1.4.0",
        "meteosignal-static-v1.4.1-pwa-reliability",
        "meteosignal-static-v1.4.1-p1b-assets",
        "meteosignal-static-v1.4.1-p1b2-css-loading",
        "meteosignal-static-v1.4.1-p1b2-weather-cancellation",
        "meteosignal-static-v1.4.1-p1b2-runtime-efficiency",
        "meteosignal-static-v1.4.1-p1c-focus-visibility",
        "meteosignal-static-v1.4.1-p1c-favorite-focus",
        "meteosignal-static-v1.4.1-p1c-live-semantics",
        "meteosignal-static-v1.4.1-p1c-semantic-structure",
        "meteosignal-static-v1.4.1-p1c-final-accessibility",
        "meteosignal-static-v1.4.1-p1d-search-privacy",
        "meteosignal-static-v1.4.1-p1d-storage-validation",
        "meteosignal-static-v1.4.1-p1d-api-cache-privacy"
    ]);
    assert.equal(harness.claimCalls.length, 1);
});

function createServiceWorkerHarness({
    active = true,
    essentialError = null,
    optionalErrors = new Map(),
    matches = new Map(),
    fetchImpl = async () => new Response("reseau"),
    cacheNames = []
} = {}) {
    const events = new Map();
    const addAllCalls = [];
    const addCalls = [];
    const operations = [];
    const deletedCaches = [];
    const skipWaitingCalls = [];
    const claimCalls = [];
    const matchRequests = [];
    const matchOptions = [];
    const openedCaches = [];
    const warnings = [];
    const cache = {
        async addAll(assets) {
            addAllCalls.push([...assets]);
            if (essentialError) {
                throw essentialError;
            }
            operations.push("precache-essential-complete");
        },
        async add(asset) {
            addCalls.push(asset);
            if (optionalErrors.has(asset.url)) {
                throw optionalErrors.get(asset.url);
            }
        },
        async match(request, options) {
            const key = typeof request === "string" ? request : request.url;
            matchRequests.push(key);
            matchOptions.push(options);
            return matches.get(key);
        }
    };
    const caches = {
        async open(name) { openedCaches.push(name); return cache; },
        async delete(name) { deletedCaches.push(name); return true; },
        async keys() { return cacheNames; }
    };
    const self = {
        location: { origin: "https://example.test", href: "https://example.test/sw.js" },
        registration: { active: active ? {} : null },
        clients: { async claim() { claimCalls.push(true); } },
        addEventListener(type, listener) { events.set(type, listener); },
        async skipWaiting() {
            operations.push("skip-waiting");
            skipWaitingCalls.push(true);
        }
    };
    const context = vm.createContext({
        Request,
        URL,
        Response,
        Set,
        Promise,
        caches,
        fetch: fetchImpl,
        self,
        console: { warn: (...args) => warnings.push(args) }
    });
    vm.runInContext(`${SW_SOURCE}\n;globalThis.__swTest = {\n        APP_VERSION, DEPLOYMENT_REVISION, CACHE_VERSION, STATIC_CACHE, ESSENTIAL_ASSETS, OPTIONAL_ASSETS,\n        installAppShell, handleNavigation, handleStaticAsset, createPrecacheRequest, isWeatherApiRequest\n    };`, context);

    return {
        api: context.__swTest,
        events,
        addAllCalls,
        addCalls,
        operations,
        deletedCaches,
        skipWaitingCalls,
        claimCalls,
        matchRequests,
        matchOptions,
        openedCaches,
        warnings
    };
}

function listFiles(directory, predicate) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(target, predicate) : (predicate(target) ? [target] : []);
    });
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectedPrecacheUrl(asset) {
    const url = new URL(asset, "https://example.test/sw.js");

    if (asset.endsWith(".js") || asset.endsWith(".css")) {
        url.searchParams.set("v", DEPLOYMENT_REVISION);
    } else if (asset.endsWith(".svg")) {
        url.searchParams.set("v", `v${DEPLOYMENT_REVISION}`);
    }

    return url.href;
}

function readStaticModuleSpecifiers(source) {
    const pattern = /\b(?:import|export)\s+(?:[^"';()]*?\s+from\s+)?["']([^"']+)["']/g;

    return [...source.matchAll(pattern)].map((match) => match[1]);
}
