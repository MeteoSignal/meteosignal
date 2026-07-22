import { APP_CONFIG } from "../../config/config.js?v=1.5.5-release";

const AIR_QUALITY_VARIABLES = [
    "european_aqi",
    "pm10",
    "pm2_5",
    "ozone",
    "nitrogen_dioxide"
];

export async function fetchAirQuality(location, options = {}) {
    const url = buildAirQualityUrl(location, options);
    const response = await fetch(url, {
        signal: options.signal,
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error("La qualité de l'air est momentanément indisponible.");
    }

    const data = await response.json();
    return normalizeAirQuality(data, {
        now: options.now,
        timezone: data?.timezone ?? location.timezone
    });
}

export function buildAirQualityUrl(location, options = {}) {
    assertValidLocation(location);
    const url = new URL(APP_CONFIG.api.openMeteo.airQualityUrl);

    url.searchParams.set("latitude", location.latitude);
    url.searchParams.set("longitude", location.longitude);
    url.searchParams.set("current", AIR_QUALITY_VARIABLES.join(","));
    url.searchParams.set("hourly", AIR_QUALITY_VARIABLES.join(","));
    url.searchParams.set("forecast_days", options.forecastDays ?? 1);
    url.searchParams.set("timezone", location.timezone ?? "auto");

    return url;
}

export function normalizeAirQuality(rawData, options = {}) {
    if (!isRecord(rawData)) {
        return null;
    }

    const current = normalizeAirQualityRecord(rawData.current);

    if (current) {
        return current;
    }

    const hourly = isRecord(rawData.hourly) ? rawData.hourly : {};
    const index = findCurrentAirQualityIndex(hourly.time, {
        now: options.now,
        timezone: options.timezone ?? rawData.timezone
    });

    if (index < 0) {
        return null;
    }

    return normalizeAirQualityRecord({
        time: hourly.time[index],
        european_aqi: hourly.european_aqi?.[index],
        pm10: hourly.pm10?.[index],
        pm2_5: hourly.pm2_5?.[index],
        ozone: hourly.ozone?.[index],
        nitrogen_dioxide: hourly.nitrogen_dioxide?.[index]
    });
}

function normalizeAirQualityRecord(record) {
    if (!isRecord(record) || !isValidLocalDateTime(record.time)) {
        return null;
    }

    const europeanAqi = numberOrNull(record.european_aqi);
    const pm10 = numberOrNull(record.pm10);
    const pm25 = numberOrNull(record.pm2_5);
    const ozone = numberOrNull(record.ozone);
    const nitrogenDioxide = numberOrNull(record.nitrogen_dioxide);

    if ([europeanAqi, pm10, pm25, ozone, nitrogenDioxide].every((value) => value === null)) {
        return null;
    }

    return {
        time: record.time,
        europeanAqi,
        pm10,
        pm25,
        ozone,
        nitrogenDioxide,
        condition: getAirQualityCondition(europeanAqi)
    };
}

export function getAirQualityCondition(value) {
    if (value === null || value === undefined || value === "") {
        return { label: "Non disponible", tone: "unknown" };
    }

    const aqi = typeof value === "number" ? value : Number.NaN;

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

function findCurrentAirQualityIndex(times, options = {}) {
    if (!Array.isArray(times) || times.length === 0) {
        return -1;
    }

    const now = normalizeDate(options.now);
    const currentWallTime = getWallClockTimestamp(now, options.timezone);
    const validTimes = times.map((time, index) => ({
        index,
        timestamp: parseLocalDateTime(time)
    })).filter(({ timestamp }) => Number.isFinite(timestamp));

    if (!Number.isFinite(currentWallTime) || validTimes.length === 0) {
        return -1;
    }

    const currentOrPast = validTimes.filter(({ timestamp }) => timestamp <= currentWallTime);

    if (currentOrPast.length > 0) {
        return currentOrPast.at(-1).index;
    }

    return validTimes[0].index;
}

function getWallClockTimestamp(date, timezone) {
    if (!timezone || timezone === "auto") {
        return Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        );
    }

    try {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }).formatToParts(date);
        const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

        return Date.UTC(
            Number(values.year),
            Number(values.month) - 1,
            Number(values.day),
            Number(values.hour),
            Number(values.minute),
            Number(values.second)
        );
    } catch (error) {
        return Number.NaN;
    }
}

function normalizeDate(value) {
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function parseLocalDateTime(value) {
    if (typeof value !== "string") {
        return Number.NaN;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);

    if (!match) {
        return Number.NaN;
    }

    const [year, month, day, hour, minute, second] = match.slice(1)
        .map((part) => Number(part ?? 0));
    const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    const date = new Date(timestamp);

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day
        && date.getUTCHours() === hour
        && date.getUTCMinutes() === minute
        && date.getUTCSeconds() === second
        ? timestamp
        : Number.NaN;
}

function numberOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isValidLocalDateTime(value) {
    return Number.isFinite(parseLocalDateTime(value));
}

function assertValidLocation(location) {
    if (!isCoordinate(location?.latitude, -90, 90)
        || !isCoordinate(location?.longitude, -180, 180)) {
        throw new TypeError("Les coordonnées de la localisation sont invalides.");
    }
}

function isCoordinate(value, minimum, maximum) {
    return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
