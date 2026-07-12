import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createLocationSearchPlan,
    createSearchRequestGuard,
    findUniqueExactInhabitedLocation,
    getAutomaticLocationSelection,
    getNextSuggestionIndex,
    normalizeSearchText,
    rankLocationResults
} from "../js/core/location-search.js";
import { normalizeGeocodingResults } from "../js/services/geocoding.service.js";

const fixtureUrl = new URL("./fixtures/geocoding.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));

test("la comparaison ignore casse, accents, tirets, apostrophes et espaces", () => {
    assert.equal(normalizeSearchText("  SAINT--Gaudéns  "), "saint gaudens");
    assert.equal(normalizeSearchText("L’Haÿ-les-Roses"), "l hay les roses");
    assert.equal(normalizeSearchText("Saint Gaudens"), normalizeSearchText("Saint-Gaudens"));
});

test("un pays explicite est reconnu sans retirer arbitrairement un mot", () => {
    const countryPlan = createLocationSearchPlan("Saint Gaudens France");
    const regionPlan = createLocationSearchPlan("Toulouse, Occitanie");
    const ordinaryPlan = createLocationSearchPlan("Saint Gaudens National Historic Site");

    assert.equal(countryPlan.place, "Saint Gaudens");
    assert.equal(countryPlan.primary.countryCode, "FR");
    assert.equal(countryPlan.supplemental.name, "Saint-Gaudens");
    assert.equal(regionPlan.place, "Toulouse");
    assert.equal(regionPlan.qualifier.type, "region");
    assert.equal(ordinaryPlan.place, "Saint Gaudens National Historic Site");
    assert.equal(ordinaryPlan.qualifier, null);
});

test("Saint-Gaudens habité passe avant le site historique et l'aéroport", () => {
    const plan = createLocationSearchPlan("Saint Gaudens");
    const results = normalizeGeocodingResults([
        ...fixture.saintGaudensOriginal,
        ...fixture.saintGaudensHyphen
    ]);
    const ranked = rankLocationResults(results, plan);

    assert.equal(ranked[0].name, "Saint-Gaudens");
    assert.equal(ranked[0].featureCode, "PPLA3");
    assert.equal(ranked.at(-1).featureCode, "AIRP");
    assert.equal(findUniqueExactInhabitedLocation(ranked, plan)?.id, 2980045);
    assert.equal(ranked.filter(({ featureCode }) => featureCode === "PRK").length, 1);
    assert.equal(ranked.find(({ featureCode }) => featureCode === "PRK")?.id, 5092119);
});

test("un code postal partagé et des homonymes restent ambigus", () => {
    const postalResults = normalizeGeocodingResults(fixture.postal31800);
    const parisResults = normalizeGeocodingResults(fixture.parisHomonyms);

    assert.equal(
        findUniqueExactInhabitedLocation(postalResults, createLocationSearchPlan("31800")),
        null
    );
    assert.equal(
        findUniqueExactInhabitedLocation(parisResults, createLocationSearchPlan("Paris")),
        null
    );
});

test("Toulouse est sélectionnable automatiquement uniquement à la validation", () => {
    const results = normalizeGeocodingResults(fixture.toulouse);
    const plan = createLocationSearchPlan("Toulouse");

    assert.equal(getAutomaticLocationSelection(results, plan, "input"), null);
    assert.equal(getAutomaticLocationSelection(results, plan, "submit")?.name, "Toulouse");
});

test("un site historique exact reste proposé sans sélection automatique", () => {
    const results = normalizeGeocodingResults(fixture.saintGaudensOriginal);
    const plan = createLocationSearchPlan("Saint Gaudens National Historic Site");

    assert.equal(rankLocationResults(results, plan)[0].featureCode, "PRK");
    assert.equal(getAutomaticLocationSelection(results, plan, "submit"), null);
});

test("la navigation clavier parcourt et reboucle les propositions", () => {
    assert.equal(getNextSuggestionIndex(-1, "ArrowDown", 3), 0);
    assert.equal(getNextSuggestionIndex(0, "ArrowUp", 3), 2);
    assert.equal(getNextSuggestionIndex(2, "ArrowDown", 3), 0);
    assert.equal(getNextSuggestionIndex(1, "Home", 3), 0);
    assert.equal(getNextSuggestionIndex(1, "End", 3), 2);
});

test("une ancienne réponse ne peut plus devenir la réponse active", () => {
    const guard = createSearchRequestGuard();
    const oldRequest = guard.next();
    const currentRequest = guard.next();

    assert.equal(guard.isCurrent(oldRequest), false);
    assert.equal(guard.isCurrent(currentRequest), true);
    guard.invalidate();
    assert.equal(guard.isCurrent(currentRequest), false);
});
