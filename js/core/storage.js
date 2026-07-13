const STORAGE_KEYS = Object.freeze({
    activeLocation: "meteosignal.activeLocation",
    favorites: "meteosignal.favorites"
});

export const MAX_STORED_FAVORITES = 100;
export const MAX_LOCATION_ID_LENGTH = 160;
export const MAX_LOCATION_NAME_LENGTH = 120;
export const MAX_LOCATION_LABEL_LENGTH = 240;
export const MAX_COUNTRY_LENGTH = 100;
export const MAX_ADMIN1_LENGTH = 120;
export const MAX_TIMEZONE_LENGTH = 80;
export const MAX_SOURCE_LENGTH = 32;
export const MAX_FEATURE_CODE_LENGTH = 16;
export const MAX_POSTCODES = 20;
export const MAX_POSTCODE_LENGTH = 32;

export const STORAGE_LIMITS = Object.freeze({
    MAX_STORED_FAVORITES,
    MAX_LOCATION_ID_LENGTH,
    MAX_LOCATION_NAME_LENGTH,
    MAX_LOCATION_LABEL_LENGTH,
    MAX_COUNTRY_LENGTH,
    MAX_ADMIN1_LENGTH,
    MAX_TIMEZONE_LENGTH,
    MAX_SOURCE_LENGTH,
    MAX_FEATURE_CODE_LENGTH,
    MAX_POSTCODES,
    MAX_POSTCODE_LENGTH
});

const ALLOWED_LOCATION_SOURCES = new Set([
    "default",
    "search",
    "geolocation",
    "manual"
]);
const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export function readActiveLocation(fallbackLocation = null) {
    const fallback = normalizeLocation(fallbackLocation);
    const stored = readStoredJson(STORAGE_KEYS.activeLocation);

    if (stored.status === "missing" || stored.status === "unavailable") {
        return fallback;
    }

    if (stored.status === "invalid") {
        removeStoredValue(STORAGE_KEYS.activeLocation);
        return fallback;
    }

    const normalizedLocation = normalizeLocation(stored.value);

    if (!normalizedLocation) {
        removeStoredValue(STORAGE_KEYS.activeLocation);
        return fallback;
    }

    repairStoredValue(STORAGE_KEYS.activeLocation, stored.value, normalizedLocation);
    return cloneLocation(normalizedLocation);
}

export function saveActiveLocation(location) {
    const normalizedLocation = normalizeLocation(location);

    if (!normalizedLocation) {
        return null;
    }

    writeStoredJson(STORAGE_KEYS.activeLocation, normalizedLocation);
    return cloneLocation(normalizedLocation);
}

export function readFavorites() {
    const stored = readStoredJson(STORAGE_KEYS.favorites);

    if (stored.status === "missing" || stored.status === "unavailable") {
        return [];
    }

    if (stored.status === "invalid" || !Array.isArray(stored.value)) {
        removeStoredValue(STORAGE_KEYS.favorites);
        return [];
    }

    const normalizedFavorites = normalizeFavorites(stored.value);
    repairStoredValue(STORAGE_KEYS.favorites, stored.value, normalizedFavorites);
    return cloneLocations(normalizedFavorites);
}

export function saveFavorites(favorites) {
    if (!Array.isArray(favorites)) {
        return readFavorites();
    }

    const normalizedFavorites = normalizeFavorites(favorites);
    writeStoredJson(STORAGE_KEYS.favorites, normalizedFavorites);
    return cloneLocations(normalizedFavorites);
}

export function isFavoriteLocation(location, favorites = readFavorites()) {
    const locationKey = getLocationKey(location);

    if (!locationKey || !Array.isArray(favorites)) {
        return false;
    }

    return favorites.some((favorite) => getLocationKey(favorite) === locationKey);
}

export function toggleFavoriteLocation(location) {
    const normalizedLocation = normalizeLocation(location);

    if (!normalizedLocation) {
        return {
            favorites: readFavorites(),
            isFavorite: false
        };
    }

    const favorites = readFavorites();
    const locationKey = getLocationKey(normalizedLocation);
    const isAlreadyFavorite = favorites.some((favorite) => getLocationKey(favorite) === locationKey);

    if (!isAlreadyFavorite && favorites.length >= MAX_STORED_FAVORITES) {
        return {
            favorites: cloneLocations(favorites),
            isFavorite: false
        };
    }

    const nextFavorites = isAlreadyFavorite
        ? favorites.filter((favorite) => getLocationKey(favorite) !== locationKey)
        : [...favorites, normalizedLocation];
    const savedFavorites = saveFavorites(nextFavorites);

    return {
        favorites: savedFavorites,
        isFavorite: savedFavorites.some((favorite) => getLocationKey(favorite) === locationKey)
    };
}

export function removeFavoriteLocation(location) {
    const locationKey = getLocationKey(location);

    if (!locationKey) {
        return readFavorites();
    }

    const favorites = readFavorites();
    const nextFavorites = favorites.filter((favorite) => getLocationKey(favorite) !== locationKey);

    return nextFavorites.length === favorites.length
        ? cloneLocations(favorites)
        : saveFavorites(nextFavorites);
}

export function getLocationKey(location) {
    if (!isRecord(location)) {
        return "";
    }

    try {
        const latitude = normalizeCoordinate(location.latitude, -90, 90);
        const longitude = normalizeCoordinate(location.longitude, -180, 180);

        if (latitude === null || longitude === null) {
            return "";
        }

        return normalizeLocationId(location.id) ?? buildCoordinateKey(latitude, longitude);
    } catch {
        return "";
    }
}

export function normalizeLocation(location) {
    if (!isRecord(location)) {
        return null;
    }

    try {
        const latitude = normalizeCoordinate(location.latitude, -90, 90);
        const longitude = normalizeCoordinate(location.longitude, -180, 180);

        if (latitude === null || longitude === null) {
            return null;
        }

        const name = normalizeText(location.name, MAX_LOCATION_NAME_LENGTH) ?? "Position actuelle";
        const country = normalizeText(location.country, MAX_COUNTRY_LENGTH);
        const admin1 = normalizeText(location.admin1, MAX_ADMIN1_LENGTH);
        const label = normalizeText(location.label, MAX_LOCATION_LABEL_LENGTH)
            ?? buildLocationLabel({ name, admin1, country });

        return {
            id: normalizeLocationId(location.id) ?? buildCoordinateKey(latitude, longitude),
            name,
            label,
            country,
            countryCode: normalizeCountryCode(location.countryCode),
            admin1,
            featureCode: normalizeText(location.featureCode, MAX_FEATURE_CODE_LENGTH),
            postcodes: normalizePostcodes(location.postcodes),
            population: normalizePopulation(location.population),
            latitude,
            longitude,
            timezone: normalizeTimezone(location.timezone),
            source: normalizeSource(location.source)
        };
    } catch {
        return null;
    }
}

function normalizeFavorites(favorites) {
    const normalizedFavorites = [];
    const seenKeys = new Set();

    try {
        for (const favorite of favorites) {
            const normalizedFavorite = normalizeLocation(favorite);

            if (!normalizedFavorite) {
                continue;
            }

            const locationKey = getLocationKey(normalizedFavorite);

            if (!locationKey || seenKeys.has(locationKey)) {
                continue;
            }

            seenKeys.add(locationKey);
            normalizedFavorites.push(normalizedFavorite);

            if (normalizedFavorites.length === MAX_STORED_FAVORITES) {
                break;
            }
        }
    } catch {
        return normalizedFavorites;
    }

    return normalizedFavorites;
}

function normalizeCoordinate(value, minimum, maximum) {
    let coordinate = value;

    if (typeof coordinate === "string") {
        coordinate = coordinate.trim();

        if (!coordinate || !DECIMAL_NUMBER_PATTERN.test(coordinate)) {
            return null;
        }

        coordinate = Number(coordinate);
    } else if (typeof coordinate !== "number") {
        return null;
    }

    if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
        return null;
    }

    return Object.is(coordinate, -0) ? 0 : coordinate;
}

function normalizeLocationId(value) {
    let identifier;

    if (typeof value === "string") {
        identifier = value.trim();
    } else if (typeof value === "number" && Number.isFinite(value)) {
        identifier = String(value);
    } else {
        return null;
    }

    return identifier && getCodePointLength(identifier) <= MAX_LOCATION_ID_LENGTH
        ? identifier
        : null;
}

function normalizeCountryCode(value) {
    if (typeof value !== "string") {
        return null;
    }

    const countryCode = value.trim();
    return /^[A-Za-z]{2}$/.test(countryCode) ? countryCode.toUpperCase() : null;
}

function normalizePostcodes(postcodes) {
    if (!Array.isArray(postcodes)) {
        return [];
    }

    const normalizedPostcodes = [];
    const seenPostcodes = new Set();

    for (const postcode of postcodes) {
        const normalizedPostcode = normalizeText(postcode, MAX_POSTCODE_LENGTH);

        if (!normalizedPostcode || seenPostcodes.has(normalizedPostcode)) {
            continue;
        }

        seenPostcodes.add(normalizedPostcode);
        normalizedPostcodes.push(normalizedPostcode);

        if (normalizedPostcodes.length === MAX_POSTCODES) {
            break;
        }
    }

    return normalizedPostcodes;
}

function normalizePopulation(value) {
    return typeof value === "number"
        && Number.isSafeInteger(value)
        && value >= 0
        ? value
        : null;
}

function normalizeTimezone(value) {
    const timezone = normalizeText(value, MAX_TIMEZONE_LENGTH);

    if (!timezone || timezone === "auto") {
        return "auto";
    }

    try {
        new Intl.DateTimeFormat("fr-FR", { timeZone: timezone }).format(0);
        return timezone;
    } catch {
        return "auto";
    }
}

function normalizeSource(value) {
    const source = normalizeText(value, MAX_SOURCE_LENGTH);
    return source && ALLOWED_LOCATION_SOURCES.has(source) ? source : "manual";
}

function normalizeText(value, maximumLength) {
    if (typeof value !== "string") {
        return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue && getCodePointLength(normalizedValue) <= maximumLength
        ? normalizedValue
        : null;
}

function buildLocationLabel({ name, admin1, country }) {
    const parts = [name, admin1, country].filter(Boolean);

    while (parts.length > 1 && getCodePointLength(parts.join(", ")) > MAX_LOCATION_LABEL_LENGTH) {
        parts.pop();
    }

    return parts.join(", ");
}

function buildCoordinateKey(latitude, longitude) {
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function getCodePointLength(value) {
    return Array.from(value).length;
}

function cloneLocation(location) {
    return {
        ...location,
        postcodes: [...location.postcodes]
    };
}

function cloneLocations(locations) {
    return locations.map(cloneLocation);
}

function readStoredJson(key) {
    const storage = getLocalStorage();

    if (!storage) {
        return { status: "unavailable", value: null };
    }

    let serializedValue;

    try {
        serializedValue = storage.getItem(key);
    } catch {
        return { status: "unavailable", value: null };
    }

    if (serializedValue === null) {
        return { status: "missing", value: null };
    }

    try {
        return { status: "valid", value: JSON.parse(serializedValue) };
    } catch {
        return { status: "invalid", value: null };
    }
}

function repairStoredValue(key, storedValue, normalizedValue) {
    if (!haveSameCanonicalValue(storedValue, normalizedValue)) {
        writeStoredJson(key, normalizedValue);
    }
}

function haveSameCanonicalValue(firstValue, secondValue) {
    try {
        return stableSerialize(firstValue) === stableSerialize(secondValue);
    } catch {
        return false;
    }
}

function stableSerialize(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(",")}]`;
    }

    const entries = Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);

    return `{${entries.join(",")}}`;
}

function writeStoredJson(key, value) {
    const storage = getLocalStorage();

    if (!storage) {
        return false;
    }

    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function removeStoredValue(key) {
    const storage = getLocalStorage();

    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

function getLocalStorage() {
    try {
        if (typeof window === "undefined") {
            return null;
        }

        const storage = window.localStorage;
        return storage || null;
    } catch {
        return null;
    }
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
