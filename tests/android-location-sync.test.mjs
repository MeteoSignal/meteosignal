import assert from "node:assert/strict";
import test from "node:test";

import {
    ANDROID_LOCATION_INTENT_MAX_LENGTH,
    createAndroidLocationSyncIntent,
    syncActiveLocationWithAndroid
} from "../js/services/android-location-sync.service.js";

const PARIS = Object.freeze({
    name: "Paris & alentours",
    label: "Paris <Île-de-France>, France",
    country: "France",
    countryCode: "fr",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris"
});

test("le deep link cible uniquement l'application MeteoSignal et encode les paramètres", () => {
    const intent = createAndroidLocationSyncIntent(PARIS);

    assert.ok(intent);
    assert.match(intent, /^intent:\/\/location\/sync\?/);
    assert.match(intent, /package=fr\.meteosignal\.app/);
    assert.match(intent, /revision=1/);
    assert.match(intent, /action=fr\.meteosignal\.app\.action\.SYNC_LOCATION/);
    assert.match(intent, /name=Paris\+%26\+alentours/);
    assert.doesNotMatch(intent, /browser_fallback_url/);
    assert.ok(intent.length <= ANDROID_LOCATION_INTENT_MAX_LENGTH);
});

test("les coordonnées invalides ne produisent aucun Intent", () => {
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, latitude: 91 }), null);
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, longitude: -181 }), null);
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, latitude: Number.NaN }), null);
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, longitude: Number.POSITIVE_INFINITY }), null);
});

test("un nom vide ou trop long est rejeté", () => {
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, name: "   " }), null);
    assert.equal(createAndroidLocationSyncIntent({ ...PARIS, name: "é".repeat(121) }), null);
});

test("les champs optionnels invalides sont omis sans invalider les coordonnées", () => {
    const intent = createAndroidLocationSyncIntent({
        ...PARIS,
        label: "x".repeat(241),
        countryCode: "FRA",
        timezone: "x".repeat(81)
    });

    assert.ok(intent);
    assert.doesNotMatch(intent, /label=/);
    assert.doesNotMatch(intent, /countryCode=/);
    assert.doesNotMatch(intent, /timezone=/);
});

test("la synchronisation utilise un lien temporaire et le retire immédiatement", () => {
    const events = [];
    const anchor = {
        setAttribute: (name, value) => events.push(["attribute", name, value]),
        click: () => events.push(["click"]),
        remove: () => events.push(["remove"])
    };
    const documentRef = {
        body: { appendChild: (element) => events.push(["append", element]) },
        createElement: (tagName) => {
            assert.equal(tagName, "a");
            return anchor;
        }
    };

    assert.equal(syncActiveLocationWithAndroid(PARIS, { documentRef }), true);
    assert.match(anchor.href, /^intent:/);
    assert.deepEqual(events.at(-2), ["click"]);
    assert.deepEqual(events.at(-1), ["remove"]);
});

test("l'absence d'environnement navigateur reste silencieuse", () => {
    assert.equal(syncActiveLocationWithAndroid(PARIS, { documentRef: {} }), false);
    assert.equal(syncActiveLocationWithAndroid({ ...PARIS, name: "" }, { documentRef: {} }), false);
});
