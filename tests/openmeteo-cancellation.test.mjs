import test from "node:test";
import assert from "node:assert/strict";

import { openMeteoProvider } from "../js/services/openmeteo.service.js";

const LOCATION = Object.freeze({
    name: "Toulouse",
    latitude: 43.6045,
    longitude: 1.444,
    timezone: "Europe/Paris"
});

test("le signal externe atteint Forecast et Air Quality sans declencher de nouvel appel", async (t) => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = (url, { signal } = {}) => new Promise((resolve, reject) => {
        calls.push({ url: new URL(url), signal });

        if (signal.aborted) {
            reject(signal.reason);
            return;
        }

        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
    t.after(() => {
        globalThis.fetch = originalFetch;
    });

    const controller = new AbortController();
    const forecastPromise = openMeteoProvider.getWeather(LOCATION, { signal: controller.signal });
    const airQualityPromise = openMeteoProvider.getAirQuality(LOCATION, { signal: controller.signal });
    const forecastRejection = assert.rejects(forecastPromise, { name: "AbortError" });
    const airQualityRejection = assert.rejects(airQualityPromise, { name: "AbortError" });

    controller.abort();
    await Promise.all([forecastRejection, airQualityRejection]);

    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(({ url }) => url.hostname).sort(), [
        "air-quality-api.open-meteo.com",
        "api.open-meteo.com"
    ]);
    assert.equal(calls.every(({ signal }) => signal.aborted), true);
});
