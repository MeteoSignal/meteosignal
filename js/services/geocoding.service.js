import { APP_CONFIG } from "../../config/config.js?v=1.4.1-search-geocoding-reliability-release";
import {
    createLocationSearchPlan,
    rankLocationResults,
    shouldRequestSupplemental
} from "../core/location-search.js?v=1.4.1-search-geocoding-reliability-release";

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
    return normalizeGeocodingResults(data.results ?? []);
}

export function normalizeGeocodingResults(results) {
    return results.map((result) => ({
        id: result.id,
        name: result.name,
        country: result.country ?? null,
        countryCode: normalizeCountryCode(result.country_code),
        admin1: result.admin1 ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone ?? "auto",
        featureCode: normalizeString(result.feature_code),
        postcodes: normalizePostcodes(result.postcodes),
        population: normalizePopulation(result.population),
        source: "search",
        label: buildLocationLabel(result)
    }));
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
    const population = Number(value);
    return Number.isFinite(population) && population >= 0 ? population : null;
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
