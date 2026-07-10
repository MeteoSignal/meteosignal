import test from "node:test";
import assert from "node:assert/strict";

import {
    createSourceMetadata,
    createWeatherSources,
    markSourceAsFallback,
    PROVENANCE_TYPES
} from "../js/core/provenance.js";
import { createWeatherState } from "../js/core/state.js";

test("les types de provenance officiels restent stables", () => {
    assert.deepEqual(PROVENANCE_TYPES, [
        "forecast",
        "observation",
        "analysis",
        "calculation"
    ]);
});

test("la provenance normalise les dates et clone les donnees imbriquees", () => {
    const station = { id: "station-1", name: "Station test" };
    const flags = ["verified", "verified", "nearby"];
    const source = createSourceMetadata({
        providerId: "test",
        type: "observation",
        observedAt: "2026-07-10T08:30:00+02:00",
        fetchedAt: "date-invalide",
        station,
        distanceKm: "4.2",
        elevation: 151,
        qualityFlags: flags
    });

    station.name = "Station modifiee";
    flags.push("late");

    assert.equal(source.observedAt, "2026-07-10T06:30:00.000Z");
    assert.equal(source.fetchedAt, null);
    assert.equal(source.station.name, "Station test");
    assert.equal(source.distanceKm, 4.2);
    assert.deepEqual(source.qualityFlags, ["verified", "nearby"]);
});

test("une source de fallback est recreee sans mutation", () => {
    const source = createSourceMetadata({
        providerId: "primary",
        type: "forecast",
        fetchedAt: "2026-07-10T06:30:00Z",
        qualityFlags: ["base"]
    });
    const fallback = markSourceAsFallback(source, "provider-fallback");

    assert.equal(source.isFallback, false);
    assert.deepEqual(source.qualityFlags, ["base"]);
    assert.equal(fallback.isFallback, true);
    assert.deepEqual(fallback.qualityFlags, ["base", "provider-fallback"]);
});

test("le modele meteo expose toujours les quatre blocs de source", () => {
    const inputSources = {
        current: createSourceMetadata({ providerId: "test", type: "forecast" })
    };
    const state = createWeatherState({ sources: inputSources });

    assert.deepEqual(Object.keys(state.sources), ["current", "hourly", "daily", "airQuality"]);
    assert.equal(state.sources.current.providerId, "test");
    assert.equal(state.sources.hourly, null);
    assert.notEqual(state.sources, inputSources);
    assert.deepEqual(createWeatherSources(), {
        current: null,
        hourly: null,
        daily: null,
        airQuality: null
    });
});

test("un type de provenance inconnu est refuse", () => {
    assert.throws(
        () => createSourceMetadata({ type: "estimated" }),
        /Type de provenance inconnu/
    );
});
