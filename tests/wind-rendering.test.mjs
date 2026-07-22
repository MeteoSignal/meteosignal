import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("les trois vues reutilisent le composant graphique partage", () => {
    const current = read("js/components/weather-cards.js");
    const hourly = read("js/components/hourly-forecast.js");
    const daily = read("js/components/daily-forecast.js");

    for (const source of [current, hourly, daily]) {
        assert.match(source, /components?\/wind-indicator\.js\?v=1\.5\.5-release|\.\/wind-indicator\.js\?v=1\.5\.5-release/);
        assert.match(source, /createWindIndicator/);
    }
    assert.match(current, /direction:\s*card\.wind\.direction/);
    assert.match(hourly, /direction:\s*hour\.windDirection/);
    assert.match(daily, /direction:\s*day\.windDirectionDominant/);
});

test("la direction horaire est demandee et normalisee sans repli sur le vent actuel", () => {
    const service = read("js/services/openmeteo.service.js");

    assert.match(service, /const HOURLY_VARIABLES[\s\S]*"wind_direction_10m"/);
    assert.match(service, /windDirection:\s*numberOrNull\(hourly\.wind_direction_10m\?\.\[index\]\)/);
    assert.doesNotMatch(read("js/components/hourly-forecast.js"), /current\.wind\.direction/);
});

test("le rendu reste compact et masque seulement les abreviations des previsions etroites", () => {
    const components = read("css/components.css");
    const responsive = read("css/responsive.css");

    assert.match(components, /\.wind-indicator\s*\{[\s\S]*display:\s*inline-flex/);
    assert.match(components, /\.wind-indicator__arrow[\s\S]*color:\s*var\(--color-cyan-300\)/);
    assert.match(responsive, /\.forecast-meta \.wind-indicator__abbreviation,[\s\S]*display:\s*none/);
    assert.doesNotMatch(responsive, /\.metric-card \.wind-indicator__abbreviation[\s\S]*display:\s*none/);
});
