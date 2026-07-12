import { APP_CONFIG } from "../../config/config.js?v=1.4.1-search-geocoding-reliability-hotfix";
import {
    createLocationSearchPlan,
    rankLocationResults,
    shouldRequestSupplemental
} from "../core/location-search.js?v=1.4.1-search-geocoding-reliability-hotfix";

export async function searchLocations(query, options = {}) {
    const plan = createLocationSearchPlan(query);

    if (plan.place.length < 2) {
        return [];
    }

    const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    const resultLimit = normalizeCount(options.limit, 8, 1, 20);
    const apiCount = normalizeCount(options.count, 16, resultLimit, 100);
    const requestOptions = {
        count: apiCount,
        language: options.language ?? "fr",
        signal: options.signal,
        fetchImpl
    };
    const primaryResults = await fetchGeocodingQuery(plan.primary, requestOptions);
    let results = primaryResults;

    if (shouldRequestSupplemental(plan, primaryResults)) {
        try {
            const supplementalResults = await fetchGeocodingQuery(plan.supplemental, requestOptions);
            results = [...primaryResults, ...supplementalResults];
        } catch (error) {
            if (isAbortError(error) || primaryResults.length === 0) {
                throw error;
            }
        }
    }

    return rankLocationResults(results, plan).slice(0, resultLimit);
}

async function fetchGeocodingQuery(searchQuery, options) {
    const url = new URL(APP_CONFIG.api.openMeteo.geocodingUrl);
    url.searchParams.set("name", searchQuery.name);
    url.searchParams.set("count", options.count);
    url.searchParams.set("language", options.language);
    url.searchParams.set("format", "json");

    if (searchQuery.countryCode) {
        url.searchParams.set("countryCode", searchQuery.countryCode);
    }

    const response = await options.fetchImpl(url, { signal: options.signal });

    if (!response.ok) {
        const error = new Error("La recherche de ville est momentanément indisponible.");
        error.status = response.status;
        throw error;
    }

    const data = await response.json();
    return normalizeGeocodingResults(isRecord(data) ? data.results : []);
}

export function normalizeGeocodingResults(results) {
    if (!Array.isArray(results)) {
        return [];
    }

    return results.map(normalizeGeocodingResult).filter(Boolean);
}

function normalizeGeocodingResult(result) {
    if (!isRecord(result)) {
        return null;
    }

    const name = normalizeString(result.name);
    const country = normalizeString(result.country);
    const admin1 = normalizeString(result.admin1);
    const latitude = normalizeCoordinate(result.latitude, -90, 90);
    const longitude = normalizeCoordinate(result.longitude, -180, 180);

    if (!name || latitude === null || longitude === null) {
        return null;
    }

    return {
        id: result.id ?? null,
        name,
        country,
        countryCode: normalizeCountryCode(result.country_code),
        admin1,
        latitude,
        longitude,
        timezone: normalizeString(result.timezone) ?? "auto",
        featureCode: normalizeString(result.feature_code),
        postcodes: normalizePostcodes(result.postcodes),
        population: normalizePopulation(result.population),
        source: "search",
        label: buildLocationLabel({ name, admin1, country })
    };
}

function buildLocationLabel(result) {
    return [result.name, result.admin1, result.country]
        .filter(Boolean)
        .join(", ");
}

function normalizeCount(value, fallback, minimum, maximum) {
    const count = Number(value);

    if (!Number.isInteger(count)) {
        return fallback;
    }

    return Math.min(Math.max(count, minimum), maximum);
}

function normalizeCountryCode(value) {
    const countryCode = normalizeString(value);
    return countryCode ? countryCode.toUpperCase() : null;
}

function normalizePostcodes(postcodes) {
    if (!Array.isArray(postcodes)) {
        return [];
    }

    return [...new Set(postcodes.map(normalizeString).filter(Boolean))];
}

function normalizePopulation(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeCoordinate(value, minimum, maximum) {
    return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
        ? value
        : null;
}

function normalizeString(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalizedValue = String(value).trim();
    return normalizedValue || null;
}

function isAbortError(error) {
    return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
