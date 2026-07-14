import { APP_CONFIG } from "../../config/config.js?v=1.4.2-w3c-feedback";
import {
    createLocationSearchPlan,
    rankLocationResults,
    shouldRequestSupplemental
} from "../core/location-search.js?v=1.4.2-w3c-feedback";

export const GEOCODING_TIMEOUT_MS = 8000;

export class GeocodingTimeoutError extends Error {
    constructor() {
        super("La recherche de ville a dépassé le délai autorisé.");
        this.name = "TimeoutError";
        this.code = "GEOCODING_TIMEOUT";
    }
}

export async function searchLocations(query, options = {}) {
    const plan = createLocationSearchPlan(query);

    if (plan.place.length < 2) {
        return [];
    }

    const requestScope = createGeocodingRequestScope(options);

    try {
        const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
        const resultLimit = normalizeCount(options.limit, 8, 1, 20);
        const apiCount = normalizeCount(options.count, 16, resultLimit, 100);
        const requestOptions = {
            count: apiCount,
            language: options.language ?? "fr",
            signal: requestScope.signal,
            fetchImpl
        };
        const primaryResults = await fetchGeocodingQuery(plan.primary, requestOptions);
        let results = primaryResults;

        requestScope.throwIfTimedOut();

        if (shouldRequestSupplemental(plan, primaryResults)) {
            try {
                const supplementalResults = await fetchGeocodingQuery(plan.supplemental, requestOptions);
                requestScope.throwIfTimedOut();
                results = [...primaryResults, ...supplementalResults];
            } catch (error) {
                if (isAbortError(error) || requestScope.didTimeOut() || primaryResults.length === 0) {
                    throw error;
                }
            }
        }

        const rankedResults = rankLocationResults(results, plan).slice(0, resultLimit);
        requestScope.throwIfTimedOut();
        return rankedResults;
    } catch (error) {
        if (requestScope.didTimeOut() && error?.code !== "GEOCODING_TIMEOUT") {
            throw new GeocodingTimeoutError();
        }

        throw error;
    } finally {
        requestScope.cleanup();
    }
}

function createGeocodingRequestScope(options) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const timeoutMs = normalizeTimeout(options.timeoutMs);
    const setTimer = options.setTimeoutImpl ?? setTimeout;
    const clearTimer = options.clearTimeoutImpl ?? clearTimeout;
    let timedOut = false;
    let timeoutId = null;
    let externalListenerAttached = false;

    const abortFromExternalSignal = () => {
        controller.abort();
    };

    if (externalSignal?.aborted) {
        abortFromExternalSignal();
    } else {
        if (externalSignal) {
            externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
            externalListenerAttached = true;
        }

        timeoutId = setTimer(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
    }

    return {
        signal: controller.signal,
        didTimeOut: () => timedOut,
        throwIfTimedOut() {
            if (timedOut) {
                throw new GeocodingTimeoutError();
            }
        },
        cleanup() {
            if (timeoutId !== null) {
                clearTimer(timeoutId);
                timeoutId = null;
            }

            if (externalListenerAttached) {
                externalSignal.removeEventListener("abort", abortFromExternalSignal);
                externalListenerAttached = false;
            }
        }
    };
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

    const response = await options.fetchImpl(url, {
        signal: options.signal,
        cache: "no-store"
    });

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

function normalizeTimeout(value) {
    return Number.isFinite(value) && value > 0 ? value : GEOCODING_TIMEOUT_MS;
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
