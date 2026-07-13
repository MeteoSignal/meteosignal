import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP_CONFIG } from "../config/config.js";
import {
    MAX_ADMIN1_LENGTH,
    MAX_COUNTRY_LENGTH,
    MAX_FEATURE_CODE_LENGTH,
    MAX_LOCATION_ID_LENGTH,
    MAX_LOCATION_LABEL_LENGTH,
    MAX_LOCATION_NAME_LENGTH,
    MAX_POSTCODES,
    MAX_POSTCODE_LENGTH,
    MAX_SOURCE_LENGTH,
    MAX_STORED_FAVORITES,
    MAX_TIMEZONE_LENGTH,
    STORAGE_LIMITS,
    getLocationKey,
    normalizeLocation,
    readActiveLocation,
    readFavorites,
    removeFavoriteLocation,
    saveActiveLocation,
    saveFavorites,
    toggleFavoriteLocation
} from "../js/core/storage.js";
import { normalizeGeocodingResults } from "../js/services/geocoding.service.js";
import { normalizeGeolocationPosition } from "../js/services/geolocation.service.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE_LOCATION_KEY = "meteosignal.activeLocation";
const FAVORITES_KEY = "meteosignal.favorites";

test("les limites du stockage sont centralisees et exportees", () => {
    assert.deepEqual(STORAGE_LIMITS, {
        MAX_STORED_FAVORITES: 100,
        MAX_LOCATION_ID_LENGTH: 160,
        MAX_LOCATION_NAME_LENGTH: 120,
        MAX_LOCATION_LABEL_LENGTH: 240,
        MAX_COUNTRY_LENGTH: 100,
        MAX_ADMIN1_LENGTH: 120,
        MAX_TIMEZONE_LENGTH: 80,
        MAX_SOURCE_LENGTH: 32,
        MAX_FEATURE_CODE_LENGTH: 16,
        MAX_POSTCODES: 20,
        MAX_POSTCODE_LENGTH: 32
    });
    assert.equal(MAX_STORED_FAVORITES, 100);
    assert.equal(MAX_LOCATION_ID_LENGTH, 160);
    assert.equal(MAX_LOCATION_NAME_LENGTH, 120);
    assert.equal(MAX_LOCATION_LABEL_LENGTH, 240);
    assert.equal(MAX_COUNTRY_LENGTH, 100);
    assert.equal(MAX_ADMIN1_LENGTH, 120);
    assert.equal(MAX_TIMEZONE_LENGTH, 80);
    assert.equal(MAX_SOURCE_LENGTH, 32);
    assert.equal(MAX_FEATURE_CODE_LENGTH, 16);
    assert.equal(MAX_POSTCODES, 20);
    assert.equal(MAX_POSTCODE_LENGTH, 32);
});

test("les bornes inclusives des coordonnees sont acceptees", () => {
    assert.equal(normalizeLocation(createLocation({ latitude: -90 })).latitude, -90);
    assert.equal(normalizeLocation(createLocation({ latitude: 90 })).latitude, 90);
    assert.equal(normalizeLocation(createLocation({ longitude: -180 })).longitude, -180);
    assert.equal(normalizeLocation(createLocation({ longitude: 180 })).longitude, 180);
});

test("les coordonnees hors bornes sont rejetees", () => {
    assert.equal(normalizeLocation(createLocation({ latitude: -90.0001 })), null);
    assert.equal(normalizeLocation(createLocation({ latitude: 90.0001 })), null);
    assert.equal(normalizeLocation(createLocation({ longitude: -180.0001 })), null);
    assert.equal(normalizeLocation(createLocation({ longitude: 180.0001 })), null);
});

test("les types ambigus et nombres non finis sont rejetes comme coordonnees", () => {
    const invalidValues = [NaN, Infinity, -Infinity, "", "   ", true, false, {}, [], [43.6]];

    invalidValues.forEach((value) => {
        assert.equal(normalizeLocation(createLocation({ latitude: value })), null);
        assert.equal(normalizeLocation(createLocation({ longitude: value })), null);
    });
});

test("les anciennes coordonnees numeriques en chaine migrent vers des nombres", () => {
    const normalized = normalizeLocation(createLocation({ latitude: "43.6045", longitude: "1.444" }));

    assert.equal(normalized.latitude, 43.6045);
    assert.equal(normalized.longitude, 1.444);
    assert.equal(typeof normalized.latitude, "number");
    assert.equal(typeof normalized.longitude, "number");
    assert.equal(normalizeLocation(createLocation({ latitude: "0x2B" })), null);
});

test("les racines non objets et les objets incomplets sont rejetes", () => {
    [null, [], 42, "Toulouse", true, {}, { latitude: 43.6 }, { longitude: 1.4 }]
        .forEach((value) => assert.equal(normalizeLocation(value), null));
});

test("la normalisation ne mute pas la source et retire toute propriete inconnue", () => {
    const source = createLocation({
        postcodes: ["31000"],
        unexpected: "a retirer"
    });
    const snapshot = JSON.stringify(source);
    const normalized = normalizeLocation(source);

    assert.equal(JSON.stringify(source), snapshot);
    source.postcodes.push("31100");

    assert.equal(JSON.stringify({ ...source, postcodes: ["31000"] }), snapshot);
    assert.deepEqual(normalized.postcodes, ["31000"]);
    assert.equal(Object.hasOwn(normalized, "unexpected"), false);
    assert.deepEqual(Object.keys(normalized), [
        "id", "name", "label", "country", "countryCode", "admin1", "featureCode",
        "postcodes", "population", "latitude", "longitude", "timezone", "source"
    ]);
});

test("les proprietes sensibles ne polluent pas le prototype canonique", () => {
    const source = JSON.parse(`{
        "id":"safe","name":"Toulouse","latitude":43.6045,"longitude":1.444,
        "__proto__":{"polluted":true},"constructor":{"polluted":true},"prototype":{"polluted":true}
    }`);
    const normalized = normalizeLocation(source);

    assert.ok(normalized);
    assert.equal(Object.hasOwn(normalized, "__proto__"), false);
    assert.equal(Object.hasOwn(normalized, "constructor"), false);
    assert.equal(Object.hasOwn(normalized, "prototype"), false);
    assert.equal({}.polluted, undefined);
});

test("les identifiants chaine et nombre deviennent des chaines canoniques", () => {
    assert.equal(normalizeLocation(createLocation({ id: "  toulouse-fr  " })).id, "toulouse-fr");
    assert.equal(normalizeLocation(createLocation({ id: 2972315 })).id, "2972315");
    assert.equal(normalizeLocation(createLocation({ id: 0 })).id, "0");
});

test("les identifiants invalides utilisent la cle de coordonnees", () => {
    const fallbackKey = "43.6045,1.4440";

    [{}, [], true, "", "   ", "x".repeat(MAX_LOCATION_ID_LENGTH + 1), Infinity]
        .forEach((id) => assert.equal(normalizeLocation(createLocation({ id })).id, fallbackKey));
});

test("les limites textuelles comptent les points de code Unicode", () => {
    const acceptedName = "😀".repeat(MAX_LOCATION_NAME_LENGTH);
    const rejectedName = `${acceptedName}😀`;
    const accepted = normalizeLocation(createLocation({ name: acceptedName, label: null }));
    const rejected = normalizeLocation(createLocation({ name: rejectedName, label: null }));

    assert.equal(accepted.name, acceptedName);
    assert.equal(Array.from(accepted.name).length, MAX_LOCATION_NAME_LENGTH);
    assert.equal(rejected.name, "Position actuelle");
    assert.equal(normalizeLocation(createLocation({ country: "é".repeat(MAX_COUNTRY_LENGTH + 1) })).country, null);
    assert.equal(normalizeLocation(createLocation({ admin1: "é".repeat(MAX_ADMIN1_LENGTH + 1) })).admin1, null);
    assert.equal(normalizeLocation(createLocation({ featureCode: "X".repeat(MAX_FEATURE_CODE_LENGTH + 1) })).featureCode, null);
});

test("les valeurs non textuelles ne sont jamais converties avec String", () => {
    const normalized = normalizeLocation(createLocation({
        name: {},
        label: [],
        country: true,
        admin1: {},
        timezone: [],
        source: false,
        featureCode: {}
    }));

    assert.equal(normalized.name, "Position actuelle");
    assert.equal(normalized.label, "Position actuelle");
    assert.equal(normalized.country, null);
    assert.equal(normalized.admin1, null);
    assert.equal(normalized.timezone, "auto");
    assert.equal(normalized.source, "manual");
    assert.equal(normalized.featureCode, null);
    assert.doesNotMatch(JSON.stringify(normalized), /\[object Object\]/);
});

test("un nom et un label invalides appliquent les replis documentes sans troncature", () => {
    const normalized = normalizeLocation(createLocation({
        name: "x".repeat(MAX_LOCATION_NAME_LENGTH + 1),
        label: "y".repeat(MAX_LOCATION_LABEL_LENGTH + 1),
        admin1: "Occitanie",
        country: "France"
    }));

    assert.equal(normalized.name, "Position actuelle");
    assert.equal(normalized.label, "Position actuelle, Occitanie, France");
});

test("le code pays accepte strictement deux lettres ASCII", () => {
    assert.equal(normalizeLocation(createLocation({ countryCode: " fr " })).countryCode, "FR");
    ["F", "FRA", "F1", "ÉF", "", true, {}]
        .forEach((countryCode) => assert.equal(normalizeLocation(createLocation({ countryCode })).countryCode, null));
});

test("les sources legitimes sont conservees et les autres deviennent manual", () => {
    ["default", "search", "geolocation", "manual"].forEach((source) => {
        assert.equal(normalizeLocation(createLocation({ source })).source, source);
    });

    ["provider", "test", "SEARCH", "", {}, true, "x".repeat(MAX_SOURCE_LENGTH + 1)]
        .forEach((source) => assert.equal(normalizeLocation(createLocation({ source })).source, "manual"));
});

test("les fuseaux IANA valides sont conserves et les valeurs invalides deviennent auto", () => {
    assert.equal(normalizeLocation(createLocation({ timezone: "Europe/Paris" })).timezone, "Europe/Paris");
    assert.equal(normalizeLocation(createLocation({ timezone: "auto" })).timezone, "auto");
    ["Invalid/Zone", "", "x".repeat(MAX_TIMEZONE_LENGTH + 1), {}, true]
        .forEach((timezone) => assert.equal(normalizeLocation(createLocation({ timezone })).timezone, "auto"));
});

test("les codes postaux sont filtres, dedupliques et limites sans changer leur ordre", () => {
    const postcodes = [
        " 31000 ", "31000", {}, [], true, "", "x".repeat(MAX_POSTCODE_LENGTH + 1),
        ...Array.from({ length: 30 }, (_, index) => `code-${index}`),
        ...Array(2000).fill("31000")
    ];
    const normalized = normalizeLocation(createLocation({ postcodes }));

    assert.equal(normalized.postcodes.length, MAX_POSTCODES);
    assert.deepEqual(normalized.postcodes, [
        "31000",
        ...Array.from({ length: MAX_POSTCODES - 1 }, (_, index) => `code-${index}`)
    ]);
});

test("la population accepte uniquement un entier sur", () => {
    assert.equal(normalizeLocation(createLocation({ population: 0 })).population, 0);
    assert.equal(normalizeLocation(createLocation({ population: 12193 })).population, 12193);
    assert.equal(normalizeLocation(createLocation({ population: Number.MAX_SAFE_INTEGER })).population, Number.MAX_SAFE_INTEGER);

    [-1, 1.5, Infinity, NaN, "12193", Number.MAX_SAFE_INTEGER + 1, {}, true]
        .forEach((population) => assert.equal(normalizeLocation(createLocation({ population })).population, null));
});

test("la cle de lieu exige des coordonnees valides et ne coercit jamais un objet", () => {
    assert.equal(getLocationKey(createLocation({ id: "  toulouse-fr  " })), "toulouse-fr");
    assert.equal(getLocationKey(createLocation({ id: null })), "43.6045,1.4440");
    assert.equal(getLocationKey(createLocation({ id: {} })), "43.6045,1.4440");
    assert.equal(getLocationKey(createLocation({ id: "x".repeat(MAX_LOCATION_ID_LENGTH + 1) })), "43.6045,1.4440");
    assert.equal(getLocationKey(createLocation({ latitude: 999 })), "");
    assert.equal(getLocationKey(null), "");
    assert.doesNotMatch(getLocationKey(createLocation({ id: {} })), /\[object Object\]/);
});

test("les favoris sont dedupliques de facon stable par identifiant", () => {
    const storage = createMemoryStorage();

    withWindow({ localStorage: storage }, () => {
        const favorites = saveFavorites([
            createLocation({ id: "same", name: "Premier" }),
            createLocation({ id: "same", name: "Second", latitude: 48.8566, longitude: 2.3522 })
        ]);

        assert.equal(favorites.length, 1);
        assert.equal(favorites[0].name, "Premier");
    });
});

test("les favoris sans identifiant sont dedupliques par coordonnees arrondies", () => {
    const storage = createMemoryStorage();

    withWindow({ localStorage: storage }, () => {
        const favorites = saveFavorites([
            createLocation({ id: null, name: "Premier", latitude: 43.60451 }),
            createLocation({ id: null, name: "Second", latitude: 43.60454 })
        ]);

        assert.equal(favorites.length, 1);
        assert.equal(favorites[0].name, "Premier");
        assert.equal(favorites[0].latitude, 43.60451);
    });
});

test("une racine favoris non tableau ou un JSON invalide est supprime sans exception", () => {
    [JSON.stringify({ city: "Toulouse" }), "{invalid-json"].forEach((serializedValue) => {
        const storage = createMemoryStorage({ [FAVORITES_KEY]: serializedValue });

        withWindow({ localStorage: storage }, () => assert.deepEqual(readFavorites(), []));
        assert.equal(storage.values.has(FAVORITES_KEY), false);
        assert.equal(countOperations(storage, "remove", FAVORITES_KEY), 1);
    });
});

test("la lecture retire les favoris invalides et conserve l'ordre du premier valide", () => {
    const serializedFavorites = JSON.stringify([
        createLocation({ id: "a", name: "Alpha" }),
        null,
        { name: "Incomplet" },
        createLocation({ id: "b", name: "Beta" }),
        createLocation({ id: "a", name: "Doublon" }),
        createLocation({ id: "bad", latitude: 999 })
    ]);
    const storage = createMemoryStorage({ [FAVORITES_KEY]: serializedFavorites });

    withWindow({ localStorage: storage }, () => {
        const favorites = readFavorites();

        assert.deepEqual(favorites.map(({ id, name }) => ({ id, name })), [
            { id: "a", name: "Alpha" },
            { id: "b", name: "Beta" }
        ]);
    });
    assert.equal(countOperations(storage, "set", FAVORITES_KEY), 1);
});

test("un tableau de favoris repare n'est reecrit qu'une seule fois", () => {
    const storage = createMemoryStorage({
        [FAVORITES_KEY]: JSON.stringify([
            createLocation({ id: 2972315, latitude: "43.6045", longitude: "1.444" }),
            createLocation({ id: 2972315, name: "Doublon" }),
            createLocation({ id: "invalid", latitude: 999 })
        ])
    });

    withWindow({ localStorage: storage }, () => {
        const firstRead = readFavorites();
        const secondRead = readFavorites();

        assert.equal(firstRead.length, 1);
        assert.equal(firstRead[0].id, "2972315");
        assert.deepEqual(secondRead, firstRead);
        assert.notEqual(secondRead, firstRead);
    });
    assert.equal(countOperations(storage, "set", FAVORITES_KEY), 1);
});

test("les favoris sont bornes a cent entrees dans leur ordre initial", () => {
    const storedFavorites = Array.from({ length: 125 }, (_, index) => createLocation({
        id: `city-${index}`,
        name: `Ville ${index}`,
        latitude: 40 + index / 1000
    }));
    const storage = createMemoryStorage({ [FAVORITES_KEY]: JSON.stringify(storedFavorites) });

    withWindow({ localStorage: storage }, () => {
        const favorites = readFavorites();

        assert.equal(favorites.length, MAX_STORED_FAVORITES);
        assert.equal(favorites[0].id, "city-0");
        assert.equal(favorites.at(-1).id, "city-99");
    });
});

test("un cent-unieme favori est refuse sans ecriture ni modification du contrat", () => {
    const storedFavorites = Array.from({ length: MAX_STORED_FAVORITES }, (_, index) => createLocation({
        id: `city-${index}`,
        name: `Ville ${index}`,
        latitude: 40 + index / 1000
    }));
    const canonicalFavorites = storedFavorites.map((favorite) => normalizeLocation(favorite));
    const storedValue = JSON.stringify(canonicalFavorites);
    const storage = createMemoryStorage({ [FAVORITES_KEY]: storedValue });

    withWindow({ localStorage: storage }, () => {
        const result = toggleFavoriteLocation(createLocation({
            id: "city-100",
            name: "Ville 100",
            latitude: 41
        }));

        assert.deepEqual(Object.keys(result), ["favorites", "isFavorite"]);
        assert.equal(result.isFavorite, false);
        assert.equal(result.favorites.length, MAX_STORED_FAVORITES);
        assert.equal(result.favorites[0].id, "city-0");
        assert.equal(result.favorites.at(-1).id, "city-99");
    });
    assert.equal(storage.values.get(FAVORITES_KEY), storedValue);
    assert.equal(countOperations(storage, "set", FAVORITES_KEY), 0);
    assert.equal(countOperations(storage, "remove", FAVORITES_KEY), 0);
});

test("une ancienne valeur valide est migree une fois puis devient idempotente", () => {
    const oldLocation = {
        id: 2972315,
        name: " Toulouse ",
        country: "France",
        countryCode: "fr",
        latitude: "43.6045",
        longitude: "1.444",
        timezone: "Europe/Paris",
        source: "search"
    };
    const storage = createMemoryStorage({ [ACTIVE_LOCATION_KEY]: JSON.stringify(oldLocation) });

    withWindow({ localStorage: storage }, () => {
        const firstRead = readActiveLocation(APP_CONFIG.defaultLocation);
        const secondRead = readActiveLocation(APP_CONFIG.defaultLocation);

        assert.equal(firstRead.id, "2972315");
        assert.equal(firstRead.name, "Toulouse");
        assert.equal(firstRead.latitude, 43.6045);
        assert.equal(firstRead.longitude, 1.444);
        assert.deepEqual(secondRead, firstRead);
    });
    assert.equal(countOperations(storage, "set", ACTIVE_LOCATION_KEY), 1);
});

test("l'ordre externe des proprietes ne provoque pas de reecriture", () => {
    const canonical = normalizeLocation(createLocation());
    const reversed = Object.fromEntries(Object.entries(canonical).reverse());
    const storage = createMemoryStorage({ [ACTIVE_LOCATION_KEY]: JSON.stringify(reversed) });

    withWindow({ localStorage: storage }, () => assert.deepEqual(readActiveLocation(), canonical));
    assert.equal(countOperations(storage, "set", ACTIVE_LOCATION_KEY), 0);
});

test("une ville active invalide est supprimee seule et le fallback n'est pas ecrit", () => {
    const storedFavorites = JSON.stringify([createLocation({ id: "favorite" })]);
    const storage = createMemoryStorage({
        [ACTIVE_LOCATION_KEY]: JSON.stringify(createLocation({ latitude: 999, longitude: -999 })),
        [FAVORITES_KEY]: storedFavorites
    });

    withWindow({ localStorage: storage }, () => {
        const fallback = readActiveLocation(APP_CONFIG.defaultLocation);

        assert.equal(fallback.id, "toulouse-fr");
        assert.equal(fallback.latitude, APP_CONFIG.defaultLocation.latitude);
    });
    assert.equal(storage.values.has(ACTIVE_LOCATION_KEY), false);
    assert.equal(storage.values.get(FAVORITES_KEY), storedFavorites);
    assert.equal(countOperations(storage, "remove", ACTIVE_LOCATION_KEY), 1);
    assert.equal(countOperations(storage, "set", ACTIVE_LOCATION_KEY), 0);
});

test("un JSON actif invalide est elimine et applique le fallback", () => {
    const storage = createMemoryStorage({ [ACTIVE_LOCATION_KEY]: "not-json" });

    withWindow({ localStorage: storage }, () => {
        assert.equal(readActiveLocation(APP_CONFIG.defaultLocation).id, "toulouse-fr");
    });
    assert.equal(storage.values.has(ACTIVE_LOCATION_KEY), false);
});

test("l'application reste utilisable sans window ni localStorage", () => {
    withWindow(undefined, () => {
        assert.equal(readActiveLocation(APP_CONFIG.defaultLocation).id, "toulouse-fr");
        assert.deepEqual(readFavorites(), []);
        assert.equal(saveActiveLocation(createLocation()).id, "toulouse-fr");
        assert.deepEqual(saveFavorites([createLocation()]).map(({ id }) => id), ["toulouse-fr"]);
    });
});

test("un getter localStorage qui leve une exception ne fait pas planter", () => {
    const throwingWindow = {};
    Object.defineProperty(throwingWindow, "localStorage", {
        get() {
            throw new Error("storage blocked");
        }
    });

    withWindow(throwingWindow, () => {
        assert.doesNotThrow(() => readFavorites());
        assert.deepEqual(readFavorites(), []);
        assert.equal(readActiveLocation(APP_CONFIG.defaultLocation).id, "toulouse-fr");
    });
});

test("les erreurs getItem setItem et removeItem restent silencieuses et non destructives", () => {
    const getErrorStorage = createMemoryStorage({}, { get: new Error("blocked") });
    withWindow({ localStorage: getErrorStorage }, () => {
        assert.deepEqual(readFavorites(), []);
        assert.equal(readActiveLocation(APP_CONFIG.defaultLocation).id, "toulouse-fr");
    });
    assert.equal(countOperations(getErrorStorage, "remove"), 0);

    const setErrorStorage = createMemoryStorage({}, { set: new Error("blocked") });
    withWindow({ localStorage: setErrorStorage }, () => {
        assert.equal(saveActiveLocation(createLocation()).id, "toulouse-fr");
        assert.equal(saveFavorites([createLocation()]).length, 1);
    });

    const removeErrorStorage = createMemoryStorage({
        [ACTIVE_LOCATION_KEY]: JSON.stringify(createLocation({ latitude: 999 }))
    }, { remove: new Error("blocked") });
    withWindow({ localStorage: removeErrorStorage }, () => {
        assert.doesNotThrow(() => readActiveLocation(APP_CONFIG.defaultLocation));
        assert.equal(readActiveLocation(APP_CONFIG.defaultLocation).id, "toulouse-fr");
    });
});

test("un quota depasse ne change pas le contrat des sauvegardes", () => {
    const quotaError = new Error("Quota exceeded");
    quotaError.name = "QuotaExceededError";
    const storage = createMemoryStorage({}, { set: quotaError });

    withWindow({ localStorage: storage }, () => {
        const active = saveActiveLocation(createLocation());
        const favorites = saveFavorites([createLocation()]);

        assert.equal(active.id, "toulouse-fr");
        assert.equal(favorites.length, 1);
        assert.equal(storage.values.size, 0);
    });
});

test("saveFavorites non tableau retourne les favoris existants sans ecriture destructive", () => {
    const canonicalFavorite = normalizeLocation(createLocation());
    const storedValue = JSON.stringify([canonicalFavorite]);
    const storage = createMemoryStorage({ [FAVORITES_KEY]: storedValue });

    withWindow({ localStorage: storage }, () => {
        const favorites = saveFavorites({ 0: createLocation() });

        assert.equal(favorites.length, 1);
        assert.equal(favorites[0].id, "toulouse-fr");
    });
    assert.equal(storage.values.get(FAVORITES_KEY), storedValue);
    assert.equal(countOperations(storage, "set", FAVORITES_KEY), 0);
    assert.equal(countOperations(storage, "remove", FAVORITES_KEY), 0);
});

test("une sauvegarde active invalide ne remplace pas une valeur valide", () => {
    const storedValue = JSON.stringify(normalizeLocation(createLocation()));
    const storage = createMemoryStorage({ [ACTIVE_LOCATION_KEY]: storedValue });

    withWindow({ localStorage: storage }, () => {
        assert.equal(saveActiveLocation(createLocation({ latitude: 999 })), null);
    });
    assert.equal(storage.values.get(ACTIVE_LOCATION_KEY), storedValue);
    assert.equal(countOperations(storage, "set", ACTIVE_LOCATION_KEY), 0);
});

test("les sauvegardes retournent des copies canoniques independantes", () => {
    const input = createLocation({ postcodes: ["31000"] });
    const storage = createMemoryStorage();

    withWindow({ localStorage: storage }, () => {
        const saved = saveActiveLocation(input);
        input.postcodes.push("31100");
        saved.postcodes.push("31200");

        assert.deepEqual(JSON.parse(storage.values.get(ACTIVE_LOCATION_KEY)).postcodes, ["31000"]);

        const firstFavorites = saveFavorites([input]);
        const secondFavorites = readFavorites();
        assert.notEqual(firstFavorites, secondFavorites);
        assert.notEqual(firstFavorites[0], secondFavorites[0]);
        assert.notEqual(firstFavorites[0].postcodes, secondFavorites[0].postcodes);
    });
});

test("toggle et remove refusent les lieux invalides et conservent leur contrat", () => {
    const storage = createMemoryStorage({ [FAVORITES_KEY]: "[]" });

    withWindow({ localStorage: storage }, () => {
        const invalidToggle = toggleFavoriteLocation(createLocation({ latitude: 999 }));
        assert.deepEqual(invalidToggle, { favorites: [], isFavorite: false });

        const added = toggleFavoriteLocation(createLocation());
        assert.equal(added.isFavorite, true);
        assert.equal(added.favorites.length, 1);

        const unchanged = removeFavoriteLocation(createLocation({ id: "toulouse-fr", latitude: 999 }));
        assert.equal(unchanged.length, 1);

        const removed = removeFavoriteLocation(createLocation());
        assert.deepEqual(removed, []);
    });
});

test("les objets reels de config recherche et geolocalisation restent compatibles sans reseau", () => {
    let networkCalls = 0;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = () => {
        networkCalls += 1;
        throw new Error("network forbidden");
    };

    try {
        const defaultLocation = normalizeLocation(APP_CONFIG.defaultLocation);
        const [searchLocation] = normalizeGeocodingResults([{
            id: 2972315,
            name: "Toulouse",
            country: "France",
            country_code: "FR",
            admin1: "Occitanie",
            latitude: 43.6045,
            longitude: 1.444,
            timezone: "Europe/Paris",
            feature_code: "PPLA",
            postcodes: ["31000"],
            population: 511684
        }]);
        const geolocation = normalizeGeolocationPosition({
            coords: { latitude: 43.6045, longitude: 1.444 }
        });

        assert.equal(normalizeLocation(searchLocation).source, "search");
        assert.equal(normalizeLocation(searchLocation).id, "2972315");
        assert.equal(normalizeLocation(geolocation).source, "geolocation");
        assert.equal(defaultLocation.source, "default");
        assert.equal(networkCalls, 0);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test("le module de stockage n'ajoute ni reseau ni injection HTML ni journal de donnees", () => {
    const source = fs.readFileSync(path.join(ROOT, "js", "core", "storage.js"), "utf8");

    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
    assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML/);
    assert.doesNotMatch(source, /console\.(?:log|warn|error|info|debug)/);
    assert.equal((source.match(/meteosignal\.(?:activeLocation|favorites)/g) ?? []).length, 2);
});

function createLocation(overrides = {}) {
    return {
        id: "toulouse-fr",
        name: "Toulouse",
        label: "Toulouse, Occitanie, France",
        country: "France",
        countryCode: "FR",
        admin1: "Occitanie",
        featureCode: "PPLA",
        postcodes: ["31000"],
        population: 511684,
        latitude: 43.6045,
        longitude: 1.444,
        timezone: "Europe/Paris",
        source: "search",
        ...overrides
    };
}

function createMemoryStorage(initialValues = {}, errors = {}) {
    const values = new Map(Object.entries(initialValues));
    const operations = [];

    return {
        values,
        operations,
        getItem(key) {
            operations.push(["get", key]);

            if (errors.get) {
                throw errors.get;
            }

            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            operations.push(["set", key]);

            if (errors.set) {
                throw errors.set;
            }

            values.set(key, String(value));
        },
        removeItem(key) {
            operations.push(["remove", key]);

            if (errors.remove) {
                throw errors.remove;
            }

            values.delete(key);
        }
    };
}

function countOperations(storage, type, key = null) {
    return storage.operations.filter(([operationType, operationKey]) => (
        operationType === type && (key === null || operationKey === key)
    )).length;
}

function withWindow(windowValue, callback) {
    const hadWindow = Object.hasOwn(globalThis, "window");
    const previousWindow = globalThis.window;

    if (windowValue === undefined) {
        delete globalThis.window;
    } else {
        globalThis.window = windowValue;
    }

    try {
        return callback();
    } finally {
        if (hadWindow) {
            globalThis.window = previousWindow;
        } else {
            delete globalThis.window;
        }
    }
}
