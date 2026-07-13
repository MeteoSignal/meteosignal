import test from "node:test";
import assert from "node:assert/strict";

import { createWeatherRefreshController } from "../js/app.js";

const REFRESH_MS = 600000;

test("une échéance visible lance une actualisation en arrière-plan", async () => {
    const harness = createRefreshHarness();

    assert.equal(await harness.controller.handleAutomaticRefresh(), true);
    assert.deepEqual(harness.loads, [{ showLoading: false }]);
});

test("les échéances masquées ne chargent rien et se regroupent en un rattrapage", async () => {
    const harness = createRefreshHarness({ visibility: "hidden" });
    harness.controller.recordSuccess(1000);

    await harness.controller.handleAutomaticRefresh();
    await harness.controller.handleAutomaticRefresh();
    await harness.controller.handleAutomaticRefresh();
    assert.deepEqual(harness.loads, []);

    harness.setVisibility("visible");
    assert.equal(await harness.controller.handleVisibilityChange(), true);
    assert.deepEqual(harness.loads, [{ showLoading: false }]);
    assert.equal(await harness.controller.handleVisibilityChange(), false);
    assert.equal(harness.loads.length, 1);
});

test("un retour visible avec des données anciennes lance une seule actualisation", async () => {
    const harness = createRefreshHarness({ now: REFRESH_MS });
    harness.controller.recordSuccess(0);

    assert.equal(await harness.controller.handleVisibilityChange(), true);
    assert.equal(harness.loads.length, 1);
});

test("un retour visible avec des données fraîches ne lance rien", async () => {
    const harness = createRefreshHarness({ now: REFRESH_MS - 1 });
    harness.controller.recordSuccess(0);

    assert.equal(await harness.controller.handleVisibilityChange(), false);
    assert.deepEqual(harness.loads, []);
});

test("une demande active empêche toute duplication", async () => {
    const harness = createRefreshHarness({ active: true, now: REFRESH_MS });
    harness.controller.recordSuccess(0);

    assert.equal(await harness.controller.handleAutomaticRefresh(), false);
    assert.equal(await harness.controller.handleVisibilityChange(), false);
    assert.deepEqual(harness.loads, []);
});

test("deux retours visibles concurrents ne lancent qu'un seul rattrapage", async () => {
    let resolveLoad;
    const pendingLoad = new Promise((resolve) => {
        resolveLoad = resolve;
    });
    const harness = createRefreshHarness({
        now: REFRESH_MS,
        loadWeather: () => pendingLoad
    });
    harness.controller.recordSuccess(0);

    const firstReturn = harness.controller.handleVisibilityChange();
    const secondReturn = harness.controller.handleVisibilityChange();
    assert.equal(await secondReturn, false);
    assert.equal(harness.loads.length, 1);

    resolveLoad();
    assert.equal(await firstReturn, true);
});

test("un succès définit exactement la référence de fraîcheur", () => {
    const harness = createRefreshHarness({ now: 123456 });

    harness.controller.recordSuccess();

    assert.equal(harness.controller.getLastSuccessAt(), 123456);
});

function createRefreshHarness({
    visibility = "visible",
    active = false,
    now = 0,
    loadWeather = async () => {}
} = {}) {
    let currentVisibility = visibility;
    let requestActive = active;
    let currentTime = now;
    const loads = [];
    const controller = createWeatherRefreshController({
        refreshMs: REFRESH_MS,
        getVisibilityState: () => currentVisibility,
        isRequestActive: () => requestActive,
        loadWeather(options) {
            loads.push(options);
            return loadWeather(options);
        },
        now: () => currentTime
    });

    return {
        controller,
        loads,
        setVisibility(value) {
            currentVisibility = value;
        },
        setRequestActive(value) {
            requestActive = value;
        },
        setNow(value) {
            currentTime = value;
        }
    };
}
