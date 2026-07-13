import test from "node:test";
import assert from "node:assert/strict";

import { createWeatherDashboardLoader } from "../js/app.js";

const TOULOUSE = Object.freeze({ name: "Toulouse" });
const PARIS = Object.freeze({ name: "Paris" });
const LYON = Object.freeze({ name: "Lyon" });

test("une nouvelle demande annule la precedente et seule la plus recente est rendue", async () => {
    let activeLocation = TOULOUSE;
    const requests = [];
    const rendered = [];
    const errors = [];
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => activeLocation,
        getWeather: createAbortableWeatherLoader(requests),
        onSuccess: (weather) => rendered.push(weather.location.name),
        onError: (error) => errors.push(error)
    });

    const firstLoad = loader.load();
    const firstSignal = requests[0].signal;
    activeLocation = PARIS;
    const secondLoad = loader.load();
    const secondSignal = requests[1].signal;

    assert.equal(firstSignal.aborted, true);
    assert.equal(secondSignal.aborted, false);
    assert.equal(loader.getActiveSignal(), secondSignal);

    requests[1].resolve({ location: PARIS });
    await Promise.all([firstLoad, secondLoad]);

    assert.deepEqual(rendered, ["Paris"]);
    assert.deepEqual(errors, []);
    assert.equal(loader.getActiveSignal(), null);
});

test("le finally obsolete conserve le controleur recent et une troisieme demande peut l'annuler", async () => {
    let activeLocation = TOULOUSE;
    const requests = [];
    const rendered = [];
    const errors = [];
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => activeLocation,
        getWeather: createAbortableWeatherLoader(requests),
        onSuccess: (weather) => rendered.push(weather.location.name),
        onError: (error) => errors.push(error)
    });

    const firstLoad = loader.load();
    activeLocation = PARIS;
    const secondLoad = loader.load();
    const secondSignal = requests[1].signal;

    await firstLoad;
    assert.equal(loader.getActiveSignal(), secondSignal);

    activeLocation = LYON;
    const thirdLoad = loader.load();
    const thirdSignal = requests[2].signal;

    assert.equal(secondSignal.aborted, true);
    assert.equal(thirdSignal.aborted, false);
    requests[2].resolve({ location: LYON });
    await Promise.all([secondLoad, thirdLoad]);

    assert.deepEqual(rendered, ["Lyon"]);
    assert.deepEqual(errors, []);
    assert.equal(loader.getActiveSignal(), null);
});

test("une reponse obsolete reste ignoree meme si son fournisseur ne traite pas l'annulation", async () => {
    let activeLocation = TOULOUSE;
    const requests = [];
    const rendered = [];
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => activeLocation,
        getWeather: (location, { signal }) => createDeferredRequest(requests, location, signal),
        onSuccess: (weather) => rendered.push(weather.location.name)
    });

    const firstLoad = loader.load();
    activeLocation = PARIS;
    const secondLoad = loader.load();

    assert.equal(requests[0].signal.aborted, true);
    requests[0].resolve({ location: TOULOUSE });
    await firstLoad;
    assert.deepEqual(rendered, []);

    requests[1].resolve({ location: PARIS });
    await secondLoad;
    assert.deepEqual(rendered, ["Paris"]);
});

test("une erreur reelle de la demande active conserve le traitement d'erreur", async () => {
    const networkError = new Error("Panne reseau");
    const errors = [];
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => TOULOUSE,
        getWeather: async () => {
            throw networkError;
        },
        onError: (error, context) => errors.push({ error, context })
    });

    await loader.load();

    assert.equal(errors.length, 1);
    assert.equal(errors[0].error, networkError);
    assert.equal(errors[0].context.location, TOULOUSE);
    assert.equal(errors[0].context.showLoading, true);
    assert.equal(loader.getActiveSignal(), null);
});

test("une erreur de rattrapage conserve le traitement d'arrière-plan", async () => {
    const networkError = new Error("Panne reseau");
    const errors = [];
    const loader = createWeatherDashboardLoader({
        getActiveLocation: () => TOULOUSE,
        getWeather: async () => {
            throw networkError;
        },
        onError: (error, context) => errors.push({ error, context })
    });

    await loader.load({ showLoading: false });

    assert.equal(errors.length, 1);
    assert.equal(errors[0].error, networkError);
    assert.equal(errors[0].context.showLoading, false);
});

function createAbortableWeatherLoader(requests) {
    return (location, { signal }) => {
        const promise = createDeferredRequest(requests, location, signal);
        const request = requests.at(-1);

        if (signal.aborted) {
            request.reject(signal.reason);
        } else {
            signal.addEventListener("abort", () => request.reject(signal.reason), { once: true });
        }

        return promise;
    };
}

function createDeferredRequest(requests, location, signal) {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    requests.push({ location, signal, resolve, reject });
    return promise;
}
