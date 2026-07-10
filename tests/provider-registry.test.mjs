import test from "node:test";
import assert from "node:assert/strict";

import {
    createWeatherProviderRegistry,
    WEATHER_CAPABILITIES
} from "../js/services/weather-provider.js";

function createProvider(id = "test") {
    return {
        id,
        name: `Provider ${id}`,
        capabilities: ["current", "hourly", "airQuality"],
        getWeather: async () => ({}),
        getAirQuality: async () => ({})
    };
}

test("le registre recherche les fournisseurs par capacite", () => {
    const registry = createWeatherProviderRegistry([createProvider()]);

    assert.equal(registry.get("test").name, "Provider test");
    assert.equal(registry.supports("test", "hourly"), true);
    assert.equal(registry.supports("test", "daily"), false);
    assert.deepEqual(registry.findByCapability("airQuality").map(({ id }) => id), ["test"]);
});

test("le registre refuse les doublons et les capacites inconnues", () => {
    const registry = createWeatherProviderRegistry([createProvider()]);

    assert.throws(() => registry.register(createProvider()), /deja enregistre/);
    assert.throws(
        () => createWeatherProviderRegistry([{
            ...createProvider("invalid"),
            capabilities: ["radar"]
        }]),
        /Capacite meteo inconnue/
    );
    assert.deepEqual(WEATHER_CAPABILITIES, [
        "current",
        "hourly",
        "daily",
        "astronomy",
        "airQuality"
    ]);
});

test("une methode est obligatoire pour chaque famille de capacites", () => {
    assert.throws(
        () => createWeatherProviderRegistry([{
            id: "missing-weather",
            name: "Missing weather",
            capabilities: ["current"]
        }]),
        /getWeather/
    );

    assert.throws(
        () => createWeatherProviderRegistry([{
            id: "missing-air",
            name: "Missing air",
            capabilities: ["airQuality"]
        }]),
        /getAirQuality/
    );
});
