import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeAirQuality } from "../js/services/air-quality.service.js";
import { normalizeOpenMeteoForecast } from "../js/services/openmeteo.service.js";

const forecastFixtureUrl = new URL("./fixtures/openmeteo/forecast.json", import.meta.url);
const airFixtureUrl = new URL("./fixtures/openmeteo/air-quality.json", import.meta.url);

test("Open-Meteo conserve le modele interne et ajoute sa provenance", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const snapshot = JSON.stringify(fixture);
    const weather = normalizeOpenMeteoForecast(fixture, {
        id: "toulouse-fr",
        name: "Toulouse",
        label: "Toulouse, France",
        country: "France",
        latitude: 43.6045,
        longitude: 1.444,
        timezone: "Europe/Paris"
    }, {
        fetchedAt: "2026-07-10T07:05:00Z"
    });

    assert.equal(weather.provider, "openmeteo");
    assert.equal(weather.current.temperature, 22.4);
    assert.equal(weather.hourly.length, 4);
    assert.equal(weather.daily.length, 2);
    assert.equal(weather.astronomy.sun.sunrise, "2026-07-10T06:23");
    assert.equal(weather.sources.current.type, "forecast");
    assert.equal(weather.sources.hourly.providerId, "openmeteo");
    assert.equal(weather.sources.daily.fetchedAt, "2026-07-10T07:05:00.000Z");
    assert.equal(weather.sources.airQuality, null);
    assert.equal(JSON.stringify(fixture), snapshot);
});

test("la normalisation Air Quality reste independante de Forecast", async () => {
    const fixture = JSON.parse(await readFile(airFixtureUrl, "utf8"));
    const airQuality = normalizeAirQuality(fixture);

    assert.equal(airQuality.europeanAqi, 24);
    assert.equal(airQuality.pm25, 7.1);
    assert.equal(airQuality.condition.label, "Bonne");
});
