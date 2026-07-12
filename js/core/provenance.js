export const PROVENANCE_TYPES = Object.freeze([
    "forecast",
    "observation",
    "analysis",
    "calculation"
]);

export const WEATHER_SOURCE_BLOCKS = Object.freeze([
    "current",
    "hourly",
    "daily",
    "airQuality"
]);

export function createSourceMetadata(overrides = {}) {
    return {
        providerId: stringOrNull(overrides.providerId),
        type: normalizeProvenanceType(overrides.type),
        observedAt: isoDateOrNull(overrides.observedAt),
        issuedAt: isoDateOrNull(overrides.issuedAt),
        fetchedAt: isoDateOrNull(overrides.fetchedAt),
        station: cloneStation(overrides.station),
        distanceKm: numberOrNull(overrides.distanceKm),
        elevation: numberOrNull(overrides.elevation),
        isFallback: Boolean(overrides.isFallback),
        attribution: stringOrNull(overrides.attribution),
        license: stringOrNull(overrides.license),
        qualityFlags: normalizeQualityFlags(overrides.qualityFlags)
    };
}

export function createWeatherSources(overrides = {}) {
    return WEATHER_SOURCE_BLOCKS.reduce((sources, block) => {
        sources[block] = overrides?.[block]
            ? createSourceMetadata(overrides[block])
            : null;
        return sources;
    }, {});
}

export function markSourceAsFallback(source, qualityFlag = null) {
    if (!source) {
        return null;
    }

    const qualityFlags = [
        ...(Array.isArray(source.qualityFlags) ? source.qualityFlags : []),
        qualityFlag
    ].filter(Boolean);

    return createSourceMetadata({
        ...source,
        isFallback: true,
        qualityFlags
    });
}

export function isoDateOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeProvenanceType(type) {
    if (type === null || type === undefined || type === "") {
        return null;
    }

    if (!PROVENANCE_TYPES.includes(type)) {
        throw new TypeError(`Type de provenance inconnu : ${type}`);
    }

    return type;
}

function cloneStation(station) {
    if (station === null || station === undefined || station === "") {
        return null;
    }

    if (typeof station === "string") {
        return station;
    }

    if (typeof station !== "object" || Array.isArray(station)) {
        return null;
    }

    return { ...station };
}

function normalizeQualityFlags(flags) {
    if (!Array.isArray(flags)) {
        return [];
    }

    return [...new Set(flags
        .map((flag) => stringOrNull(flag))
        .filter(Boolean))];
}

function stringOrNull(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    return normalized || null;
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
