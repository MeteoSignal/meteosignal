import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createWeatherDashboardLoader } from "../js/app.js?v=1.4.2-immersive-dashboard-p6f-test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX_SOURCE = read("index.html");
const APP_SOURCE = read("js/app.js");
const FAVORITES_SOURCE = read("js/components/favorites.js");
const HOURLY_SOURCE = read("js/components/hourly-forecast.js");
const SEARCH_SOURCE = read("js/components/search.js");
const PWA_SOURCE = read("pwa.js");
const SW_SOURCE = read("sw.js");

test("le statut global reste une region live concise et atomique", () => {
    const tag = getTagById(INDEX_SOURCE, "app-status");

    assert.match(tag, /class="sr-only"/);
    assert.match(tag, /role="status"/);
    assert.match(tag, /aria-live="polite"/);
    assert.match(tag, /aria-atomic="true"/);
});

test("le statut de recherche reste une region live distincte et atomique", () => {
    const tag = getTagById(INDEX_SOURCE, "search-status");

    assert.match(tag, /role="status"/);
    assert.match(tag, /aria-live="polite"/);
    assert.match(tag, /aria-atomic="true"/);
    assert.match(INDEX_SOURCE, /aria-describedby="search-status"/);
});

test("seuls app-status et search-status sont des regions live permanentes", () => {
    const liveTags = INDEX_SOURCE.match(/<[^>]+aria-live="[^"]+"[^>]*>/g) ?? [];

    assert.equal(liveTags.length, 2);
    assert.deepEqual(liveTags.map((tag) => tag.match(/id="([^"]+)"/)?.[1]), [
        "app-status",
        "search-status"
    ]);
});

test("les grands conteneurs meteo ne sont plus des regions live", () => {
    [
        "weather-cards",
        "hourly-forecast",
        "daily-forecast",
        "astronomy-grid",
        "weather-alerts-list"
    ].forEach((attribute) => {
        const tag = getTagByDataAttribute(INDEX_SOURCE, attribute);
        assert.doesNotMatch(tag, /aria-live=/);
    });
});

test("la representation canonique des favoris n'est pas une region live", () => {
    const tags = getTagsByDataAttribute(INDEX_SOURCE, "favorites-list");

    assert.equal(tags.length, 1);
    assert.doesNotMatch(tags[0], /aria-live=/);
});

test("aucun composant n'ajoute un role status ou alert pendant un rendu", () => {
    const componentSources = fs.readdirSync(path.join(ROOT, "js", "components"))
        .filter((name) => name.endsWith(".js"))
        .map((name) => read(path.join("js", "components", name)))
        .join("\n");

    assert.doesNotMatch(componentSources, /setAttribute\(\s*["']role["']\s*,\s*["'](?:status|alert)["']/);
    assert.doesNotMatch(INDEX_SOURCE, /role="alert"/);
});

test("un chargement reussi declenche une seule annonce finale", async () => {
    const announcements = [];
    const location = { name: "Toulouse" };
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => location,
        getWeather: async () => ({ location: { name: "Toulouse" }, errors: [] }),
        onSuccess: (weather) => announcements.push(`Météo mise à jour pour ${weather.location.name}.`)
    });

    await loader.load();

    assert.deepEqual(announcements, ["Météo mise à jour pour Toulouse."]);
    assert.equal(countOccurrences(getBalancedBlock(APP_SOURCE, "onSuccess(weather)"), "setDashboardBusy("), 1);
});

test("une erreur active declenche un seul traitement d'annonce", async () => {
    const announcements = [];
    const location = { name: "Toulouse" };
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => location,
        getWeather: async () => {
            throw new Error("Panne réseau");
        },
        onError: () => announcements.push("Données météo indisponibles.")
    });

    await loader.load();

    assert.deepEqual(announcements, ["Données météo indisponibles."]);
    assert.equal(countOccurrences(getBalancedBlock(APP_SOURCE, "function renderDashboardError"), "setDashboardBusy("), 1);
});

test("les callbacks de favoris ne produisent qu'une annonce globale par action", () => {
    const toggleBlock = getBalancedBlock(APP_SOURCE, "function handleFavoriteToggle({ isFavorite, location })");
    const removeBlock = getBalancedBlock(APP_SOURCE, "function handleFavoriteRemove({ location, removedActiveLocation })");

    assert.equal(countOccurrences(toggleBlock, "setText(\"#app-status\""), 1);
    assert.equal(countOccurrences(removeBlock, "setText(\"#app-status\""), 1);
    assert.doesNotMatch(`${toggleBlock}\n${removeBlock}`, /#search-status/);
});

test("le changement de plage horaire annonce une phrase concise apres le clic", () => {
    const clickBlock = getBalancedBlock(HOURLY_SOURCE, "button.addEventListener(\"click\"");
    const handlerBlock = getBalancedBlock(APP_SOURCE, "function handleHourlyRangeChange({ label })");

    assert.equal(countOccurrences(HOURLY_SOURCE, "hourlyOptions.onRangeChange"), 1);
    assert.match(clickBlock, /renderActiveHourlyRange\(false\);[\s\S]*hourlyOptions\.onRangeChange\?\.\(getActiveRange\(\)\);/);
    assert.match(handlerBlock, /Prévisions horaires affichées pour la plage \$\{label\}\./);
    assert.equal(countOccurrences(handlerBlock, "setText(\"#app-status\""), 1);
});

test("le rendu horaire initial ne declenche aucune annonce de plage", () => {
    const initialRenderBlock = getBalancedBlock(HOURLY_SOURCE, "export function renderHourlyForecast(hourly = [])");
    const loadingBlock = getBalancedBlock(HOURLY_SOURCE, "export function renderHourlyForecastLoading");

    assert.doesNotMatch(initialRenderBlock, /onRangeChange/);
    assert.doesNotMatch(loadingBlock, /onRangeChange/);
});

test("une erreur de recherche reste dediee au statut de la combobox", () => {
    const interactionErrorBlock = getBalancedBlock(APP_SOURCE, "function showInteractionError");
    const reportSearchErrorBlock = getBalancedBlock(APP_SOURCE, "function reportSearchError");

    assert.doesNotMatch(interactionErrorBlock, /#search-status/);
    assert.doesNotMatch(reportSearchErrorBlock, /#app-status/);
    assert.match(SEARCH_SOURCE, /const SEARCH_STATUS_SELECTOR = "#search-status"/);
    assert.doesNotMatch(SEARCH_SOURCE, /#app-status/);
});

test("la notification PWA utilise uniquement le statut global", () => {
    assert.match(PWA_SOURCE, /document\.querySelector\("#app-status"\)/);
    assert.doesNotMatch(PWA_SOURCE, /#search-status/);
});

test("l'etat HTML initial des favoris vides ne declare aucune liste", () => {
    const tags = getTagsByDataAttribute(INDEX_SOURCE, "favorites-list");

    assert.equal(tags.length, 1);
    assert.doesNotMatch(tags[0], /role="list"/);
    assert.equal(countOccurrences(INDEX_SOURCE, "Aucune ville enregistrée pour le moment."), 1);
});

test("les revisions JavaScript, CSS et PWA restent coherentes", () => {
    assert.match(INDEX_SOURCE, /js\/app\.js\?v=1\.4\.2-immersive-dashboard-p6f/);
    assert.match(APP_SOURCE, /components\/favorites\.js\?v=1\.4\.2-immersive-dashboard-p6f/);
    assert.match(APP_SOURCE, /components\/hourly-forecast\.js\?v=1\.4\.2-immersive-dashboard-p6f/);
    assert.match(SW_SOURCE, /const CACHE_PREFIX = "meteosignal-static"/);
    assert.match(SW_SOURCE, /const DEPLOYMENT_REVISION = `\$\{APP_VERSION\}-immersive-dashboard-p6f`/);
    assert.match(SW_SOURCE, /const CACHE_VERSION = `v\$\{DEPLOYMENT_REVISION\}`/);
    assert.match(INDEX_SOURCE, /css\/[^"']+\?v=1\.4\.2-immersive-dashboard-p6f/);
    assert.doesNotMatch(INDEX_SOURCE, /css\/[^"']+\?v=1\.4\.1-/);
});

function read(relativePath) {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function getTagById(source, id) {
    return source.match(new RegExp(`<[^>]+id="${id}"[^>]*>`))?.[0] ?? "";
}

function getTagByDataAttribute(source, attribute) {
    return getTagsByDataAttribute(source, attribute)[0] ?? "";
}

function getTagsByDataAttribute(source, attribute) {
    return source.match(new RegExp(`<[^>]+data-${attribute}(?:="[^"]*")?[^>]*>`, "g")) ?? [];
}

function getBalancedBlock(source, marker) {
    const markerIndex = source.indexOf(marker);
    assert.notEqual(markerIndex, -1, `Marqueur introuvable : ${marker}`);
    const start = source.indexOf("{", markerIndex + marker.length);
    let depth = 0;

    for (let index = start; index < source.length; index += 1) {
        if (source[index] === "{") depth += 1;
        if (source[index] === "}") depth -= 1;

        if (depth === 0) {
            return source.slice(markerIndex, index + 1);
        }
    }

    throw new Error(`Bloc incomplet : ${marker}`);
}

function countOccurrences(source, value) {
    return source.split(value).length - 1;
}
