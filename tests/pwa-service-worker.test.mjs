import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SW_SOURCE = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

test("le precache contient une seule URL canonique par fichier local", () => {
    const { api } = createServiceWorkerHarness();
    const assets = [...api.ESSENTIAL_ASSETS, ...api.OPTIONAL_ASSETS];
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));

    assert.equal(api.ESSENTIAL_ASSETS.length, 36);
    assert.equal(api.OPTIONAL_ASSETS.length, 19);
    assert.equal(assets.length, 55);
    assert.equal(new Set(assets).size, assets.length);
    assert.equal(assets.some((asset) => asset.includes("open-meteo.com")), false);
    assert.equal(assets.includes("./assets/logo/logo-meteosignal-sans-slogan.webp"), true);
    assert.equal(assets.includes("./assets/logo/logo-meteosignal-sans-slogan.png"), false);
    assert.equal(assets.includes("./css/style.css"), false);
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");

    for (const asset of assets) {
        assert.match(asset, /^\.\//);
        assert.equal(asset.includes("?"), false, asset);
        assert.equal(fs.existsSync(path.join(ROOT, asset.slice(2))), true, asset);
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
    assert.equal(api.CACHE_VERSION, "v1.4.1-p1d-storage-validation");
    assert.match(indexSource, /src="js\/clock\.js\?v=1\.4\.1-p1b2-runtime-efficiency"/);
    assert.match(indexSource, /src="js\/app\.js\?v=1\.4\.1-p1d-storage-validation"/);
    assert.match(api.CACHE_VERSION, new RegExp(`^v${escapeRegExp(packageVersion)}(?:-|$)`));
    assert.ok(cacheBusterVersions.length > 0);
    assert.deepEqual(new Set(cacheBusterVersions), new Set([packageVersion]));
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
        optionalErrors: new Map([[missingAsset, new Error("facultatif indisponible")]])
    });

    await harness.api.installAppShell();

    assert.equal(harness.addAllCalls.length, 1);
    assert.deepEqual(harness.addAllCalls[0], [...harness.api.ESSENTIAL_ASSETS]);
    assert.equal(harness.addCalls.length, harness.api.OPTIONAL_ASSETS.length);
    assert.equal(harness.skipWaitingCalls.length, 1);
    assert.equal(harness.warnings.length, 1);
    assert.match(harness.warnings[0][0], /manifest\.json/);
});

test("une mise a jour installee reste en attente", async () => {
    const harness = createServiceWorkerHarness({ active: true });

    await harness.api.installAppShell();

    assert.equal(harness.skipWaitingCalls.length, 0);
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

test("les ressources statiques ignorent le cache-buster et preservent les 404 en ligne", async () => {
    const cachedAsset = new Response("cache");
    const cachedHarness = createServiceWorkerHarness({
        matches: new Map([["https://example.test/app/app.js?v=1.4.1", cachedAsset]])
    });
    const cachedResult = await cachedHarness.api.handleStaticAsset({
        url: "https://example.test/app/app.js?v=1.4.1"
    });

    assert.equal(cachedResult, cachedAsset);
    assert.equal(cachedHarness.matchOptions[0].ignoreSearch, true);

    const online404 = new Response("absent", { status: 404 });
    const onlineHarness = createServiceWorkerHarness({ fetchImpl: async () => online404 });
    assert.equal(await onlineHarness.api.handleStaticAsset({ url: "https://example.test/absent.js" }), online404);

    const offlineHarness = createServiceWorkerHarness({
        fetchImpl: async () => { throw new TypeError("hors ligne"); }
    });
    const offlineResult = await offlineHarness.api.handleStaticAsset({ url: "https://example.test/absent.js" });
    assert.equal(offlineResult.status, 504);
});

test("les appels meteo restent strictement network-only", async () => {
    const apiResponse = new Response("donnees");
    const harness = createServiceWorkerHarness({ fetchImpl: async () => apiResponse });
    let responsePromise;
    const request = {
        method: "GET",
        mode: "cors",
        url: "https://api.open-meteo.com/v1/forecast"
    };

    harness.events.get("fetch")({
        request,
        respondWith(value) {
            responsePromise = value;
        }
    });

    assert.equal(await responsePromise, apiResponse);
    assert.equal(harness.matchRequests.length, 0);
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
            "meteosignal-static-v1.4.1-p1d-storage-validation"
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
        "meteosignal-static-v1.4.1-p1d-search-privacy"
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
    const deletedCaches = [];
    const skipWaitingCalls = [];
    const claimCalls = [];
    const matchRequests = [];
    const matchOptions = [];
    const warnings = [];
    const cache = {
        async addAll(assets) {
            addAllCalls.push([...assets]);
            if (essentialError) {
                throw essentialError;
            }
        },
        async add(asset) {
            addCalls.push(asset);
            if (optionalErrors.has(asset)) {
                throw optionalErrors.get(asset);
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
        async open() { return cache; },
        async delete(name) { deletedCaches.push(name); return true; },
        async keys() { return cacheNames; }
    };
    const self = {
        location: { origin: "https://example.test" },
        registration: { active: active ? {} : null },
        clients: { async claim() { claimCalls.push(true); } },
        addEventListener(type, listener) { events.set(type, listener); },
        async skipWaiting() { skipWaitingCalls.push(true); }
    };
    const context = vm.createContext({
        URL,
        Response,
        Set,
        Promise,
        caches,
        fetch: fetchImpl,
        self,
        console: { warn: (...args) => warnings.push(args) }
    });
    vm.runInContext(`${SW_SOURCE}\n;globalThis.__swTest = {\n        APP_VERSION, CACHE_VERSION, STATIC_CACHE, ESSENTIAL_ASSETS, OPTIONAL_ASSETS,\n        installAppShell, handleNavigation, handleStaticAsset, isWeatherApiRequest\n    };`, context);

    return {
        api: context.__swTest,
        events,
        addAllCalls,
        addCalls,
        deletedCaches,
        skipWaitingCalls,
        claimCalls,
        matchRequests,
        matchOptions,
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
