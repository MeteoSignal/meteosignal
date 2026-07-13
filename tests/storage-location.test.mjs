import test from "node:test";
import assert from "node:assert/strict";

import {
    readFavorites,
    saveActiveLocation
} from "../js/core/storage.js";

test("un ancien favori sans les nouveaux champs reste compatible", () => {
    const localStorage = createMemoryStorage({
        "meteosignal.favorites": JSON.stringify([{
            id: 2972315,
            name: "Toulouse",
            label: "Toulouse, Occitanie, France",
            country: "France",
            countryCode: "FR",
            admin1: "Occitanie",
            latitude: 43.6043,
            longitude: 1.4437,
            timezone: "Europe/Paris",
            source: "search"
        }])
    });
    const previousWindow = globalThis.window;
    globalThis.window = { localStorage };

    try {
        const [favorite] = readFavorites();

        assert.equal(favorite.name, "Toulouse");
        assert.equal(favorite.featureCode, null);
        assert.deepEqual(favorite.postcodes, []);
        assert.equal(favorite.population, null);
    } finally {
        globalThis.window = previousWindow;
    }
});

test("la ville active conserve featureCode, postcodes et population", () => {
    const localStorage = createMemoryStorage();
    const previousWindow = globalThis.window;
    globalThis.window = { localStorage };

    try {
        const saved = saveActiveLocation({
            id: 2980045,
            name: "Saint-Gaudens",
            country: "France",
            countryCode: "fr",
            admin1: "Occitanie",
            latitude: 43.1081,
            longitude: 0.7232,
            timezone: "Europe/Paris",
            featureCode: "PPLA3",
            postcodes: ["31800", "31800"],
            population: 12193
        });

        assert.equal(saved.countryCode, "FR");
        assert.equal(saved.featureCode, "PPLA3");
        assert.deepEqual(saved.postcodes, ["31800"]);
        assert.equal(saved.population, 12193);
    } finally {
        globalThis.window = previousWindow;
    }
});

function createMemoryStorage(initialValues = {}) {
    const values = new Map(Object.entries(initialValues));

    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        }
    };
}
