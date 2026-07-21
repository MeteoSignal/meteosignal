import { APP_CONFIG } from "../../config/config.js?v=1.5.2-location-sync";
import { getMoonPhase } from "../core/moon.js?v=1.5.2-location-sync";
import { createSourceMetadata } from "../core/provenance.js?v=1.5.2-location-sync";
import { createWeatherState } from "../core/state.js?v=1.5.2-location-sync";
import { getWeatherCondition } from "../core/weather-codes.js?v=1.5.2-location-sync";
import { fetchAirQuality } from "./air-quality.service.js?v=1.5.2-location-sync";

const CURRENT_VARIABLES = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation",
    "rain",
    "weather_code",
    "cloud_cover",
    "pressure_msl",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "is_day"
];

const HOURLY_VARIABLES = [
    "temperature_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "weather_code",
    "uv_index",
    "wind_speed_10m",
    "wind_direction_10m"
];

const DAILY_VARIABLES = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "daylight_duration",
    "uv_index_max",
    "precipitation_sum",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant"
];

export const openMeteoProvider = {
    id: "openmeteo",
    name: "Open-Meteo",
    enabled: true,
    capabilities: ["current", "hourly", "daily", "astronomy", "airQuality"],
    coverage: "global",
    requiresProxy: false,
    attribution: "Open-Meteo",
    license: null,
    async getWeather(location, options = {}) {
        return fetchOpenMeteoForecast(location, options);
    },
    async getAirQuality(location, options = {}) {
        const airQuality = await fetchAirQuality(location, options);
        const fetchedAt = new Date().toISOString();

        return createWeatherState({
            airQuality,
            sources: {
                airQuality: createOpenMeteoSource({
                    type: "analysis",
                    fetchedAt
                })
            }
        });
    },
    normalize(rawData, location, context = {}) {
        return normalizeOpenMeteoForecast(rawData, location, context);
    }
};

export async function fetchOpenMeteoForecast(location, options = {}) {
    const url = buildForecastUrl(location, options);
    let rawData;
    const qualityFlags = [];

    try {
        rawData = await fetchJson(url, options);
    } catch (error) {
        if (isAbortError(error) || !url.searchParams.has("forecast_hours")) {
            throw error;
        }

        const fallbackUrl = buildForecastUrl(location, {
            ...options,
            forecastHours: null
        });
        rawData = await fetchJson(fallbackUrl, options);
        qualityFlags.push("forecast-hours-fallback");
    }

    return normalizeOpenMeteoForecast(rawData, location, {
        fetchedAt: new Date().toISOString(),
        qualityFlags
    });
}

export function buildForecastUrl(location, options = {}) {
    assertValidLocation(location);
    const url = new URL(APP_CONFIG.api.openMeteo.forecastUrl);
    const timezone = location.timezone ?? "auto";
    const forecastDays = options.forecastDays ?? APP_CONFIG.api.openMeteo.forecastDays ?? 7;
    const forecastHours = options.forecastHours === null
        ? null
        : options.forecastHours ?? APP_CONFIG.api.openMeteo.forecastHours ?? 72;

    url.searchParams.set("latitude", location.latitude);
    url.searchParams.set("longitude", location.longitude);
    url.searchParams.set("current", CURRENT_VARIABLES.join(","));
    url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));
    url.searchParams.set("daily", DAILY_VARIABLES.join(","));
    url.searchParams.set("forecast_days", forecastDays);
    if (forecastHours !== null) {
        url.searchParams.set("forecast_hours", forecastHours);
    }
    url.searchParams.set("timezone", timezone);

    return url;
}

export function normalizeOpenMeteoForecast(rawData, location = {}, context = {}) {
    const response = isRecord(rawData) ? rawData : {};
    const current = normalizeCurrentWeather(response.current);
    const daily = normalizeDailyForecast(response.daily);
    const hourly = normalizeHourlyForecast(response.hourly, current?.time, daily);
    const astronomy = normalizeAstronomy(daily[0]);
    const fetchedAt = context.fetchedAt ?? new Date().toISOString();
    const sourceContext = {
        type: "forecast",
        fetchedAt,
        qualityFlags: context.qualityFlags
    };

    return createWeatherState({
        provider: openMeteoProvider.id,
        location: normalizeLocation(response, location),
        current,
        hourly,
        daily,
        astronomy,
        updatedAt: current?.time ?? fetchedAt,
        sources: {
            current: current ? createOpenMeteoSource(sourceContext) : null,
            hourly: hourly.length > 0 ? createOpenMeteoSource(sourceContext) : null,
            daily: daily.length > 0 ? createOpenMeteoSource(sourceContext) : null
        },
        errors: []
    });
}

function normalizeLocation(rawData, location) {
    const responseLatitude = validCoordinate(rawData.latitude, -90, 90);
    const responseLongitude = validCoordinate(rawData.longitude, -180, 180);
    const requestedLatitude = validCoordinate(location.latitude, -90, 90);
    const requestedLongitude = validCoordinate(location.longitude, -180, 180);
    const hasValidResponseCoordinates = responseLatitude !== null && responseLongitude !== null;
    const latitude = hasValidResponseCoordinates ? responseLatitude : requestedLatitude;
    const longitude = hasValidResponseCoordinates ? responseLongitude : requestedLongitude;

    if (latitude === null || longitude === null) {
        return null;
    }

    return {
        id: location.id ?? null,
        name: location.name ?? "Position actuelle",
        label: location.label ?? buildLocationLabel(location),
        country: location.country ?? null,
        countryCode: location.countryCode ?? null,
        admin1: location.admin1 ?? null,
        latitude,
        longitude,
        timezone: normalizeOptionalString(rawData.timezone)
            ?? normalizeOptionalString(location.timezone)
            ?? "auto",
        source: location.source ?? "provider"
    };
}

function normalizeCurrentWeather(current) {
    if (!isRecord(current) || !isValidLocalDateTime(current.time)) {
        return null;
    }

    const temperature = numberOrNull(current.temperature_2m);
    const weatherCode = numberOrNull(current.weather_code);

    if (temperature === null || weatherCode === null) {
        return null;
    }

    const condition = getWeatherCondition(current.weather_code, current.is_day !== 0);

    return {
        time: current.time ?? null,
        temperature,
        apparentTemperature: numberOrNull(current.apparent_temperature),
        humidity: numberOrNull(current.relative_humidity_2m),
        precipitation: numberOrNull(current.precipitation),
        rain: numberOrNull(current.rain),
        pressure: numberOrNull(current.pressure_msl),
        cloudCover: numberOrNull(current.cloud_cover),
        weatherCode,
        condition,
        isDay: current.is_day !== 0,
        wind: {
            speed: numberOrNull(current.wind_speed_10m),
            direction: numberOrNull(current.wind_direction_10m),
            gusts: numberOrNull(current.wind_gusts_10m)
        }
    };
}

function normalizeHourlyForecast(hourly = {}, currentTime = null, daily = []) {
    if (!isRecord(hourly) || !Array.isArray(hourly.time)) {
        return [];
    }

    const normalizedHours = hourly.time.map((time, index) => normalizeHourlyEntry(hourly, time, index, daily))
        .filter(Boolean);
    const times = normalizedHours.map((hour) => hour.time);
    const startIndex = findForecastStartIndex(times, currentTime);
    const forecastHours = APP_CONFIG.api.openMeteo.forecastHours ?? 72;
    const endIndex = Math.min(startIndex + forecastHours, times.length);
    const selectedHours = normalizedHours.slice(startIndex, endIndex);

    return selectedHours.map((hour, index) => ({
        ...hour,
        isCurrent: index === 0 && isTimeWithinHourlyPeriod(
            currentTime,
            hour.time,
            selectedHours[index + 1]?.time
        )
    }));
}

function normalizeHourlyEntry(hourly, time, index, daily) {
    const temperature = numberOrNull(hourly.temperature_2m?.[index]);
    const weatherCode = numberOrNull(hourly.weather_code?.[index]);

    if (!isValidLocalDateTime(time) || temperature === null || weatherCode === null) {
        return null;
    }

    const isDay = isDayAtTime(time, daily);

    return {
        time,
        temperature,
        apparentTemperature: numberOrNull(hourly.apparent_temperature?.[index]),
        precipitationProbability: numberOrNull(hourly.precipitation_probability?.[index]),
        precipitation: numberOrNull(hourly.precipitation?.[index]),
        uvIndex: numberOrNull(hourly.uv_index?.[index]),
        windSpeed: numberOrNull(hourly.wind_speed_10m?.[index]),
        windDirection: numberOrNull(hourly.wind_direction_10m?.[index]),
        weatherCode,
        condition: getWeatherCondition(weatherCode, isDay),
        isDay
    };
}

function isDayAtTime(time, daily = []) {
    if (!time) {
        return true;
    }

    const timestamp = parseLocalDateTime(time);

    if (!Number.isFinite(timestamp)) {
        return true;
    }

    const matchingDay = daily.find((day) => {
        if (!day?.date) {
            return false;
        }

        return String(time).startsWith(day.date);
    });

    if (!matchingDay?.sunrise || !matchingDay?.sunset) {
        const hour = Number(String(time).slice(11, 13));

        return hour >= 7 && hour < 20;
    }

    const sunrise = parseLocalDateTime(matchingDay.sunrise);
    const sunset = parseLocalDateTime(matchingDay.sunset);

    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset)) {
        return true;
    }

    return timestamp >= sunrise && timestamp < sunset;
}

function normalizeDailyForecast(daily = {}) {
    if (!isRecord(daily) || !Array.isArray(daily.time)) {
        return [];
    }

    return daily.time.map((date, index) => {
        const weatherCode = numberOrNull(daily.weather_code?.[index]);
        const temperatureMax = numberOrNull(daily.temperature_2m_max?.[index]);
        const temperatureMin = numberOrNull(daily.temperature_2m_min?.[index]);

        if (!isValidCalendarDate(date)
            || weatherCode === null
            || temperatureMax === null
            || temperatureMin === null) {
            return null;
        }

        return {
            date,
            temperatureMax,
            temperatureMin,
            apparentTemperatureMax: numberOrNull(daily.apparent_temperature_max?.[index]),
            apparentTemperatureMin: numberOrNull(daily.apparent_temperature_min?.[index]),
            precipitationSum: numberOrNull(daily.precipitation_sum?.[index]),
            precipitationProbabilityMax: numberOrNull(daily.precipitation_probability_max?.[index]),
            uvIndexMax: numberOrNull(daily.uv_index_max?.[index]),
            sunrise: daily.sunrise?.[index] ?? null,
            sunset: daily.sunset?.[index] ?? null,
            daylightDuration: numberOrNull(daily.daylight_duration?.[index]),
            windSpeedMax: numberOrNull(daily.wind_speed_10m_max?.[index]),
            windGustsMax: numberOrNull(daily.wind_gusts_10m_max?.[index]),
            windDirectionDominant: numberOrNull(daily.wind_direction_10m_dominant?.[index]),
            weatherCode,
            condition: getWeatherCondition(weatherCode, true)
        };
    }).filter(Boolean);
}

function normalizeAstronomy(today) {
    if (!today || !isValidLocalDateTime(today.sunrise) || !isValidLocalDateTime(today.sunset)) {
        return null;
    }

    return {
        sun: {
            sunrise: today.sunrise,
            sunset: today.sunset,
            daylightDuration: today.daylightDuration
        },
        moon: getMoonPhase(today.date),
        uvIndexMax: today.uvIndexMax
    };
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        signal: options.signal,
        cache: "no-store"
    });

    if (!response.ok) {
        const error = new Error("La météo est momentanément indisponible.");
        error.details = {
            provider: openMeteoProvider.id,
            status: response.status
        };
        throw error;
    }

    return response.json();
}

function createOpenMeteoSource(overrides = {}) {
    return createSourceMetadata({
        providerId: openMeteoProvider.id,
        type: overrides.type ?? "forecast",
        observedAt: overrides.observedAt,
        issuedAt: overrides.issuedAt,
        fetchedAt: overrides.fetchedAt,
        isFallback: false,
        attribution: openMeteoProvider.attribution,
        license: openMeteoProvider.license,
        qualityFlags: overrides.qualityFlags
    });
}

function isAbortError(error) {
    return error?.name === "AbortError" || error?.code === "REQUEST_ABORTED";
}

function findForecastStartIndex(times, currentTime) {
    const currentTimestamp = parseLocalDateTime(currentTime);

    if (!Number.isFinite(currentTimestamp) || times.length === 0) {
        return 0;
    }

    let selectedIndex = -1;

    times.forEach((time, index) => {
        const timestamp = parseLocalDateTime(time);

        if (Number.isFinite(timestamp) && timestamp <= currentTimestamp) {
            selectedIndex = index;
        }
    });

    return selectedIndex >= 0 ? selectedIndex : 0;
}

function isTimeWithinHourlyPeriod(currentTime, periodStart, nextPeriodStart = null) {
    const currentTimestamp = parseLocalDateTime(currentTime);
    const startTimestamp = parseLocalDateTime(periodStart);
    const parsedNextTimestamp = parseLocalDateTime(nextPeriodStart);
    const endTimestamp = Number.isFinite(parsedNextTimestamp)
        ? parsedNextTimestamp
        : startTimestamp + 60 * 60 * 1000;

    return Number.isFinite(currentTimestamp)
        && Number.isFinite(startTimestamp)
        && currentTimestamp >= startTimestamp
        && currentTimestamp < endTimestamp;
}

function numberOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function assertValidLocation(location) {
    if (validCoordinate(location?.latitude, -90, 90) === null
        || validCoordinate(location?.longitude, -180, 180) === null) {
        throw new TypeError("Les coordonnées de la localisation sont invalides.");
    }
}

function validCoordinate(value, minimum, maximum) {
    return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum
        ? value
        : null;
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized || null;
}

function isValidCalendarDate(value) {
    if (typeof value !== "string") {
        return false;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return false;
    }

    return isValidUtcDateParts(match.slice(1).map(Number));
}

function isValidLocalDateTime(value) {
    return Number.isFinite(parseLocalDateTime(value));
}

function parseLocalDateTime(value) {
    if (typeof value !== "string") {
        return Number.NaN;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);

    if (!match) {
        return Number.NaN;
    }

    const parts = match.slice(1).map((part) => Number(part ?? 0));
    const [year, month, day, hour, minute, second] = parts;
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

function isValidUtcDateParts([year, month, day]) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function buildLocationLabel(location) {
    return [location.name, location.admin1, location.country]
        .filter(Boolean)
        .join(", ");
}
