const STORAGE_KEYS = {
    activeLocation: "meteosignal.activeLocation",
    favorites: "meteosignal.favorites"
};

export function readActiveLocation(fallbackLocation = null) {
    const storedLocation = normalizeLocation(readJson(STORAGE_KEYS.activeLocation, null));
    return storedLocation ?? normalizeLocation(fallbackLocation);
}

export function saveActiveLocation(location) {
    const normalizedLocation = normalizeLocation(location);

    if (!normalizedLocation) {
        return null;
    }

    writeJson(STORAGE_KEYS.activeLocation, normalizedLocation);
    return normalizedLocation;
}

export function readFavorites() {
    const favorites = readJson(STORAGE_KEYS.favorites, []);

    return Array.isArray(favorites)
        ? favorites.map(normalizeLocation).filter(Boolean)
        : [];
}

export function saveFavorites(favorites) {
    const seenKeys = new Set();
    const normalizedFavorites = favorites.reduce((items, favorite) => {
        const normalizedFavorite = normalizeLocation(favorite);
        const locationKey = getLocationKey(normalizedFavorite);

        if (!normalizedFavorite || !locationKey || seenKeys.has(locationKey)) {
            return items;
        }

        seenKeys.add(locationKey);
        items.push(normalizedFavorite);
        return items;
    }, []);

    writeJson(STORAGE_KEYS.favorites, normalizedFavorites);
    return normalizedFavorites;
}

export function isFavoriteLocation(location, favorites = readFavorites()) {
    const locationKey = getLocationKey(location);

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
    const nextFavorites = isAlreadyFavorite
        ? favorites.filter((favorite) => getLocationKey(favorite) !== locationKey)
        : [...favorites, normalizedLocation];

    return {
        favorites: saveFavorites(nextFavorites),
        isFavorite: !isAlreadyFavorite
    };
}

export function removeFavoriteLocation(location) {
    const locationKey = getLocationKey(location);

    if (!locationKey) {
        return readFavorites();
    }

    const nextFavorites = readFavorites()
        .filter((favorite) => getLocationKey(favorite) !== locationKey);

    return saveFavorites(nextFavorites);
}

export function getLocationKey(location) {
    if (!location) {
        return "";
    }

    if (location.id) {
        return String(location.id);
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return "";
    }

    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function normalizeLocation(location) {
    if (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude))) {
        return null;
    }

    return {
        id: location.id ?? getLocationKey(location),
        name: location.name ?? "Position actuelle",
        label: location.label ?? buildLocationLabel(location),
        country: location.country ?? null,
        countryCode: normalizeCountryCode(location.countryCode),
        admin1: location.admin1 ?? null,
        featureCode: normalizeOptionalString(location.featureCode),
        postcodes: normalizePostcodes(location.postcodes),
        population: normalizePopulation(location.population),
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        timezone: location.timezone ?? "auto",
        source: location.source ?? "manual"
    };
}

function normalizeCountryCode(value) {
    const countryCode = normalizeOptionalString(value);
    return countryCode ? countryCode.toUpperCase() : null;
}

function normalizePostcodes(postcodes) {
    if (!Array.isArray(postcodes)) {
        return [];
    }

    return [...new Set(postcodes.map(normalizeOptionalString).filter(Boolean))];
}

function normalizePopulation(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const population = Number(value);
    return Number.isFinite(population) && population >= 0 ? population : null;
}

function normalizeOptionalString(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || null;
}

function readJson(key, fallbackValue) {
    if (!hasLocalStorage()) {
        return fallbackValue;
    }

    try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallbackValue;
    } catch (error) {
        console.warn(`Impossible de lire ${key}`, error);
        return fallbackValue;
    }
}

function writeJson(key, value) {
    if (!hasLocalStorage()) {
        return;
    }

    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Impossible d'écrire ${key}`, error);
    }
}

function hasLocalStorage() {
    return typeof window !== "undefined" && Boolean(window.localStorage);
}

function buildLocationLabel(location) {
    return [location.name, location.admin1, location.country]
        .filter(Boolean)
        .join(", ");
}
