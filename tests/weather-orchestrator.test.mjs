import test from "node:test";
import assert from "node:assert/strict";

import { createSourceMetadata } from "../js/core/provenance.js";
import { createWeatherState } from "../js/core/state.js";
import { createWeatherOrchestrator } from "../js/services/weather-orchestrator.service.js";
import { createWeatherProviderRegistry } from "../js/services/weather-provider.js";

const LOCATION = Object.freeze({
    id: "toulouse-fr",
    name: "Toulouse",
    label: "Toulouse, France",
    latitude: 43.6045,
    longitude: 1.444,
    timezone: "Europe/Paris"
});

const FIXED_NOW = () => new Date("2026-07-10T07:00:00Z");

test("un fournisseur commun produit un appel Forecast et un appel Air Quality", async () => {
    const counters = { weather: 0, air: 0 };
    const providerResult = deepFreeze(createCompleteWeatherResult("primary"));
    const snapshot = JSON.stringify(providerResult);
    const provider = createFakeProvider({
        id: "primary",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: providerResult,
        airResult: createAirResult("primary"),
        counters
    });
    const registry = createWeatherProviderRegistry([provider]);
    const orchestrator = createWeatherOrchestrator({
        registry,
        policy: createPolicy("primary"),
        compatibilityProviderId: "primary",
        now: FIXED_NOW
    });

    const weather = await orchestrator.getWeather(LOCATION);

    assert.equal(counters.weather, 1);
    assert.equal(counters.air, 1);
    assert.equal(weather.current.temperature, 21);
    assert.equal(weather.hourly.length, 2);
    assert.equal(weather.daily.length, 1);
    assert.equal(weather.airQuality.europeanAqi, 24);
    assert.equal(weather.sources.current.isFallback, false);
    assert.equal(weather.sources.airQuality.type, "analysis");
    assert.equal(JSON.stringify(providerResult), snapshot);
});

test("une capacite absente bascule seule, sans fusionner les valeurs", async () => {
    const primaryCounters = { weather: 0, air: 0 };
    const fallbackCounters = { weather: 0, air: 0 };
    const primaryResult = createCompleteWeatherResult("primary");
    primaryResult.hourly = [];
    primaryResult.sources.hourly = null;

    const primary = createFakeProvider({
        id: "primary",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: primaryResult,
        airResult: createAirResult("primary"),
        counters: primaryCounters
    });
    const fallback = createFakeProvider({
        id: "fallback",
        capabilities: ["hourly"],
        weatherResult: createWeatherState({
            hourly: [{ time: "2026-07-10T10:00", temperature: 99 }],
            sources: { hourly: sourceFor("fallback") }
        }),
        counters: fallbackCounters
    });
    const registry = createWeatherProviderRegistry([primary, fallback]);
    const policy = createPolicy("primary", { hourly: ["fallback"] });
    const orchestrator = createWeatherOrchestrator({ registry, policy, now: FIXED_NOW });

    const weather = await orchestrator.getWeather(LOCATION);

    assert.equal(primaryCounters.weather, 1);
    assert.equal(primaryCounters.air, 1);
    assert.equal(fallbackCounters.weather, 1);
    assert.deepEqual(weather.hourly.map(({ temperature }) => temperature), [99]);
    assert.equal(weather.current.temperature, 21);
    assert.equal(weather.sources.current.providerId, "primary");
    assert.equal(weather.sources.hourly.providerId, "fallback");
    assert.equal(weather.sources.hourly.isFallback, true);
    assert.ok(weather.errors.some(({ details }) => (
        details.providerId === "primary"
        && details.capability === "hourly"
        && details.code === "PROVIDER_DATA_MISSING"
    )));
});

test("une capacite declaree sans donnee produit une erreur ciblee", async () => {
    const result = createCompleteWeatherResult("partial");
    result.hourly = [];
    result.sources.hourly = null;
    const provider = createFakeProvider({
        id: "partial",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: result,
        airResult: createAirResult("partial")
    });
    const orchestrator = createWeatherOrchestrator({
        registry: createWeatherProviderRegistry([provider]),
        policy: createPolicy("partial"),
        now: FIXED_NOW
    });

    const weather = await orchestrator.getWeather(LOCATION);
    const hourlyError = weather.errors.find(({ details }) => details.capability === "hourly");

    assert.deepEqual(weather.hourly, []);
    assert.equal(hourlyError.details.providerId, "partial");
    assert.equal(hourlyError.details.code, "PROVIDER_DATA_MISSING");
    assert.equal(weather.current.temperature, 21);
});

test("un timeout peut activer un fallback explicite", async () => {
    const stable = createFakeProvider({
        id: "stable",
        capabilities: ["current", "daily", "astronomy", "airQuality"],
        weatherResult: createCompleteWeatherResult("stable"),
        airResult: createAirResult("stable")
    });
    const slow = createFakeProvider({
        id: "slow",
        capabilities: ["hourly"],
        weatherResult: ({ signal }) => waitForAbort(signal)
    });
    const fallback = createFakeProvider({
        id: "fallback",
        capabilities: ["hourly"],
        weatherResult: createWeatherState({
            hourly: [{ time: "2026-07-10T10:00", temperature: 18 }],
            sources: { hourly: sourceFor("fallback") }
        })
    });
    const registry = createWeatherProviderRegistry([stable, slow, fallback]);
    const policy = createPolicy("stable", {
        hourly: ["fallback"]
    });
    policy.capabilities.hourly.primary = "slow";
    const orchestrator = createWeatherOrchestrator({ registry, policy, timeoutMs: 10, now: FIXED_NOW });

    const weather = await orchestrator.getWeather(LOCATION);

    assert.equal(weather.hourly[0].temperature, 18);
    assert.equal(weather.sources.hourly.isFallback, true);
    assert.ok(weather.errors.some(({ details }) => (
        details.providerId === "slow"
        && details.capability === "hourly"
        && details.code === "PROVIDER_TIMEOUT"
    )));
});

test("un AbortSignal externe annule toute l'orchestration", async () => {
    const provider = createFakeProvider({
        id: "primary",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: createCompleteWeatherResult("primary"),
        airResult: createAirResult("primary")
    });
    const controller = new AbortController();
    controller.abort();
    const orchestrator = createWeatherOrchestrator({
        registry: createWeatherProviderRegistry([provider]),
        policy: createPolicy("primary"),
        now: FIXED_NOW
    });

    await assert.rejects(
        () => orchestrator.getWeather(LOCATION, { signal: controller.signal }),
        ({ name }) => name === "AbortError"
    );
});

test("une annulation externe en cours traverse les groupes sans activer les fallbacks", async () => {
    const primarySignals = {};
    const fallbackCounters = { weather: 0, air: 0 };
    const primary = createFakeProvider({
        id: "primary",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: ({ signal }) => {
            primarySignals.weather = signal;
            return waitForAbort(signal);
        },
        airResult: ({ signal }) => {
            primarySignals.air = signal;
            return waitForAbort(signal);
        }
    });
    const fallback = createFakeProvider({
        id: "fallback",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: createCompleteWeatherResult("fallback"),
        airResult: createAirResult("fallback"),
        counters: fallbackCounters
    });
    const fallbackPolicy = Object.fromEntries([
        "current",
        "hourly",
        "daily",
        "astronomy",
        "airQuality"
    ].map((capability) => [capability, ["fallback"]]));
    const controller = new AbortController();
    const orchestrator = createWeatherOrchestrator({
        registry: createWeatherProviderRegistry([primary, fallback]),
        policy: createPolicy("primary", fallbackPolicy),
        timeoutMs: 1000,
        now: FIXED_NOW
    });

    const weatherPromise = orchestrator.getWeather(LOCATION, { signal: controller.signal });
    await Promise.resolve();

    assert.equal(primarySignals.weather.aborted, false);
    assert.equal(primarySignals.air.aborted, false);
    controller.abort();

    await assert.rejects(weatherPromise, { name: "AbortError" });
    assert.equal(primarySignals.weather.aborted, true);
    assert.equal(primarySignals.air.aborted, true);
    assert.deepEqual(fallbackCounters, { weather: 0, air: 0 });
});

test("le fallback de compatibilite reste encapsule dans l'orchestrateur", async () => {
    const counters = { weather: 0, air: 0 };
    const compatibility = createFakeProvider({
        id: "openmeteo",
        capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
        weatherResult: createCompleteWeatherResult("openmeteo"),
        airResult: createAirResult("openmeteo"),
        counters
    });
    const orchestrator = createWeatherOrchestrator({
        registry: createWeatherProviderRegistry([compatibility]),
        policy: createPolicy("missing-provider"),
        compatibilityProviderId: "openmeteo",
        now: FIXED_NOW
    });

    const weather = await orchestrator.getWeather(LOCATION);

    assert.equal(counters.weather, 1);
    assert.equal(counters.air, 1);
    assert.equal(weather.sources.current.isFallback, true);
    assert.ok(weather.sources.current.qualityFlags.includes("orchestrator-compatibility-fallback"));
    assert.ok(weather.errors.some(({ details }) => details.capability === "orchestrator"));
});

function createFakeProvider({
    id,
    capabilities,
    weatherResult = null,
    airResult = null,
    counters = { weather: 0, air: 0 }
}) {
    const provider = {
        id,
        name: `Provider ${id}`,
        capabilities,
        attribution: `Attribution ${id}`
    };

    if (capabilities.some((capability) => capability !== "airQuality")) {
        provider.getWeather = async (location, options) => {
            counters.weather += 1;
            return typeof weatherResult === "function"
                ? weatherResult({ location, ...options })
                : weatherResult;
        };
    }

    if (capabilities.includes("airQuality")) {
        provider.getAirQuality = async (location, options) => {
            counters.air += 1;
            return typeof airResult === "function"
                ? airResult({ location, ...options })
                : airResult;
        };
    }

    return provider;
}

function createCompleteWeatherResult(providerId) {
    return createWeatherState({
        provider: providerId,
        location: LOCATION,
        current: {
            time: "2026-07-10T09:00",
            temperature: 21,
            apparentTemperature: 22,
            humidity: 60,
            precipitation: 0,
            pressure: 1015,
            condition: { label: "Clair", tone: "clear", icon: "sun" },
            isDay: true,
            wind: { speed: 8, direction: 270, gusts: 15 }
        },
        hourly: [
            { time: "2026-07-10T09:00", temperature: 21 },
            { time: "2026-07-10T10:00", temperature: 22 }
        ],
        daily: [{ date: "2026-07-10", temperatureMin: 15, temperatureMax: 29 }],
        astronomy: { sun: { sunrise: "2026-07-10T06:23", sunset: "2026-07-10T21:36" } },
        updatedAt: "2026-07-10T09:00",
        sources: {
            current: sourceFor(providerId),
            hourly: sourceFor(providerId),
            daily: sourceFor(providerId)
        }
    });
}

function createAirResult(providerId) {
    return createWeatherState({
        airQuality: {
            time: "2026-07-10T09:00",
            europeanAqi: 24,
            condition: { label: "Bonne", tone: "good" }
        },
        sources: {
            airQuality: createSourceMetadata({
                providerId,
                type: "analysis",
                fetchedAt: "2026-07-10T07:00:00Z"
            })
        }
    });
}

function sourceFor(providerId) {
    return createSourceMetadata({
        providerId,
        type: "forecast",
        fetchedAt: "2026-07-10T07:00:00Z"
    });
}

function createPolicy(primary, fallbacks = {}) {
    return {
        requestTimeoutMs: 100,
        compatibilityProviderId: primary,
        capabilities: Object.fromEntries([
            "current",
            "hourly",
            "daily",
            "astronomy",
            "airQuality"
        ].map((capability) => [
            capability,
            {
                primary,
                fallbacks: fallbacks[capability] ?? []
            }
        ]))
    };
}

function waitForAbort(signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }

        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
}

function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
        return value;
    }

    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}
