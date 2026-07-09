import { APP_CONFIG } from "../../config/config.js?v=1.1.6-stabilization-final";

export async function searchLocations(query, options = {}) {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
        return [];
    }

    const url = new URL(APP_CONFIG.api.openMeteo.geocodingUrl);
    url.searchParams.set("name", normalizedQuery);
    url.searchParams.set("count", options.count ?? 8);
    url.searchParams.set("language", options.language ?? "fr");
    url.searchParams.set("format", "json");

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("La recherche de ville est momentanément indisponible.");
    }

    const data = await response.json();
    return normalizeGeocodingResults(data.results ?? []);
}

export function normalizeGeocodingResults(results) {
    return results.map((result) => ({
        id: result.id,
        name: result.name,
        country: result.country,
        countryCode: result.country_code,
        admin1: result.admin1 ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
        population: result.population ?? null,
        source: "search",
        label: buildLocationLabel(result)
    }));
}

function buildLocationLabel(result) {
    return [result.name, result.admin1, result.country]
        .filter(Boolean)
        .join(", ");
}
