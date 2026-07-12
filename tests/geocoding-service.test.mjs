import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    normalizeGeocodingResults,
    searchLocations
} from "../js/services/geocoding.service.js";

const fixtureUrl = new URL("./fixtures/geocoding.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

test("Saint Gaudens utilise au maximum une variante complémentaire", async () => {
    const requests = [];
    const results = await searchLocations("Saint Gaudens", {
        fetchImpl: createFixtureFetch(requests)
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].searchParams.get("name"), "Saint Gaudens");
    assert.equal(requests[1].searchParams.get("name"), "Saint-Gaudens");
    assert.equal(results[0].name, "Saint-Gaudens");
    assert.equal(results[0].featureCode, "PPLA3");
    assert.deepEqual(results[0].postcodes.slice(0, 2), ["31800", "31801 CEDEX"]);
});

test("la fusion retire le doublon semantique du site historique", async () => {
    const results = await searchLocations("Saint Gaudens", {
        fetchImpl: createFixtureFetch([])
    });
    const historicSites = results.filter(({ featureCode }) => featureCode === "PRK");

    assert.equal(historicSites.length, 1);
    assert.equal(historicSites[0].id, 5092119);
    assert.equal(historicSites[0].name, "Saint Gaudens National Historic Site");
});

test("Saint-Gaudens exact ne déclenche aucune requête complémentaire", async () => {
    const requests = [];
    const results = await searchLocations("Saint-Gaudens", {
        fetchImpl: createFixtureFetch(requests)
    });

    assert.equal(requests.length, 1);
    assert.equal(results[0].name, "Saint-Gaudens");
});

test("Saint Gaudens France applique le countryCode explicite", async () => {
    const requests = [];
    const results = await searchLocations("Saint Gaudens France", {
        fetchImpl: createFixtureFetch(requests)
    });

    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map((url) => url.searchParams.get("countryCode")), ["FR", "FR"]);
    assert.deepEqual(requests.map((url) => url.searchParams.get("name")), [
        "Saint Gaudens",
        "Saint-Gaudens"
    ]);
    assert.equal(results[0].countryCode, "FR");
});

test("codes postaux, villes exactes et homonymes conservent leurs résultats", async () => {
    const postalRequests = [];
    const toulouseRequests = [];
    const parisRequests = [];
    const postalResults = await searchLocations("31800", {
        fetchImpl: createFixtureFetch(postalRequests)
    });
    const toulouseResults = await searchLocations("Toulouse", {
        fetchImpl: createFixtureFetch(toulouseRequests)
    });
    const parisResults = await searchLocations("Paris", {
        fetchImpl: createFixtureFetch(parisRequests)
    });

    assert.equal(postalRequests.length, 1);
    assert.equal(postalResults.length, 3);
    assert.equal(toulouseRequests.length, 1);
    assert.equal(toulouseResults[0].name, "Toulouse");
    assert.equal(parisRequests.length, 1);
    assert.equal(parisResults.filter(({ name }) => name === "Paris").length, 2);
});

test("le site historique explicite reste accessible", async () => {
    const requests = [];
    const results = await searchLocations("Saint Gaudens National Historic Site", {
        fetchImpl: createFixtureFetch(requests)
    });

    assert.equal(requests.length, 1);
    assert.equal(results[0].featureCode, "PRK");
});

test("aucun résultat et erreur réseau sont gérés sans requête réelle", async () => {
    const requests = [];
    const emptyResults = await searchLocations("zzzz", {
        fetchImpl: createFixtureFetch(requests)
    });

    assert.deepEqual(emptyResults, []);
    assert.equal(requests.length, 1);

    await assert.rejects(
        searchLocations("Toulouse", {
            fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) })
        }),
        /momentanément indisponible/
    );
});

test("AbortSignal annule immédiatement la recherche active", async () => {
    const controller = new AbortController();
    const promise = searchLocations("Toulouse", {
        signal: controller.signal,
        fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => {
            signal.addEventListener("abort", () => {
                const error = new Error("Recherche annulée");
                error.name = "AbortError";
                reject(error);
            }, { once: true });
        })
    });

    controller.abort();
    await assert.rejects(promise, { name: "AbortError" });
});

test("les resultats de geocodage incomplets ou hors bornes sont ignores", () => {
    const results = normalizeGeocodingResults([
        null,
        {},
        { name: "Sans coordonnées" },
        { name: "Latitude invalide", latitude: 91, longitude: 1 },
        { name: "Longitude invalide", latitude: 43, longitude: -181 },
        { name: "Chaînes", latitude: "43", longitude: "1" },
        { name: "Valide", latitude: 43.6, longitude: 1.44, country: "France" }
    ]);

    assert.equal(results.length, 1);
    assert.equal(results[0].name, "Valide");
    assert.equal(results[0].label, "Valide, France");
    assert.deepEqual(normalizeGeocodingResults({ results: [] }), []);
});

test("une reponse JSON geocodage inattendue devient une liste vide", async () => {
    const results = await searchLocations("Toulouse", {
        fetchImpl: async () => ({
            ok: true,
            status: 200,
            json: async () => ({ results: { name: "Toulouse" } })
        })
    });

    assert.deepEqual(results, []);
});

function createFixtureFetch(requests) {
    return async (input) => {
        const url = new URL(input);
        const name = url.searchParams.get("name");
        const countryCode = url.searchParams.get("countryCode");
        requests.push(url);

        let results = [];

        if (name === "Saint Gaudens") {
            results = countryCode === "FR" ? [] : fixture.saintGaudensOriginal;
        } else if (name === "Saint-Gaudens") {
            results = fixture.saintGaudensHyphen;
        } else if (name === "Saint Gaudens National Historic Site") {
            results = fixture.saintGaudensOriginal;
        } else if (name === "31800") {
            results = fixture.postal31800;
        } else if (name === "Toulouse") {
            results = fixture.toulouse;
        } else if (name === "Paris") {
            results = fixture.parisHomonyms;
        }

        if (countryCode) {
            results = results.filter((result) => result.country_code === countryCode);
        }

        return {
            ok: true,
            status: 200,
            async json() {
                return { results };
            }
        };
    };
}
