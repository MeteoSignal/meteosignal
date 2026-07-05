import { APP_CONFIG } from "../../config/config.js";

const AIR_QUALITY_VARIABLES = [
    "european_aqi",
    "pm10",
    "pm2_5",
    "ozone",
    "nitrogen_dioxide"
];

export async function fetchAirQuality(location, options = {}) {
    const url = buildAirQualityUrl(location, options);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("La qualité de l'air est momentanément indisponible.");
    }

    const data = await response.json();
    return normalizeAirQuality(data);
}

export function buildAirQualityUrl(location, options = {}) {
    const url = new URL(APP_CONFIG.api.openMeteo.airQualityUrl);

    url.searchParams.set("latitude", location.latitude);
    url.searchParams.set("longitude", location.longitude);
    url.searchParams.set("hourly", AIR_QUALITY_VARIABLES.join(","));
    url.searchParams.set("forecast_days", options.forecastDays ?? 1);
    url.searchParams.set("timezone", location.timezone ?? "auto");

    return url;
}

export function normalizeAirQuality(rawData) {
    const hourly = rawData.hourly ?? {};
    const index = findCurrentAirQualityIndex(hourly.time ?? []);
    const europeanAqi = numberOrNull(hourly.european_aqi?.[index]);

    return {
        time: hourly.time?.[index] ?? null,
        europeanAqi,
        pm10: numberOrNull(hourly.pm10?.[index]),
        pm25: numberOrNull(hourly.pm2_5?.[index]),
        ozone: numberOrNull(hourly.ozone?.[index]),
        nitrogenDioxide: numberOrNull(hourly.nitrogen_dioxide?.[index]),
        condition: getAirQualityCondition(europeanAqi)
    };
}

export function getAirQualityCondition(value) {
    const aqi = Number(value);

    if (!Number.isFinite(aqi)) {
        return { label: "Non disponible", tone: "unknown" };
    }

    if (aqi <= 20) {
        return { label: "Très bonne", tone: "excellent" };
    }

    if (aqi <= 40) {
        return { label: "Bonne", tone: "good" };
    }

    if (aqi <= 60) {
        return { label: "Moyenne", tone: "moderate" };
    }

    if (aqi <= 80) {
        return { label: "Dégradée", tone: "poor" };
    }

    if (aqi <= 100) {
        return { label: "Mauvaise", tone: "bad" };
    }

    return { label: "Très mauvaise", tone: "very-bad" };
}

function findCurrentAirQualityIndex(times) {
    const now = Date.now();
    const index = times.findIndex((time) => new Date(time).getTime() >= now);

    return index >= 0 ? index : 0;
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}
