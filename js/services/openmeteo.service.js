import { APP_CONFIG } from "../../config/config.js?v=1.4.0-multi-api-foundation";
import { getMoonPhase } from "../core/moon.js?v=1.4.0-multi-api-foundation";
import { createSourceMetadata } from "../core/provenance.js?v=1.4.0-multi-api-foundation";
import { createWeatherState } from "../core/state.js?v=1.4.0-multi-api-foundation";
import { getWeatherCondition } from "../core/weather-codes.js?v=1.4.0-multi-api-foundation";
import { fetchAirQuality } from "./air-quality.service.js?v=1.4.0-multi-api-foundation";

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
    "wind_speed_10m"
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
    const current = rawData.current ?? {};
    const currentIsDay = current.is_day !== 0;
    const daily = normalizeDailyForecast(rawData.daily, currentIsDay);
    const fetchedAt = context.fetchedAt ?? new Date().toISOString();
    const sourceContext = {
        type: "forecast",
        fetchedAt,
        qualityFlags: context.qualityFlags
    };

    return createWeatherState({
        provider: openMeteoProvider.id,
        location: normalizeLocation(rawData, location),
        current: normalizeCurrentWeather(current),
        hourly: normalizeHourlyForecast(rawData.hourly, current.time, daily),
        daily,
        astronomy: normalizeAstronomy(daily[0]),
        updatedAt: current.time ?? new Date().toISOString(),
        sources: {
            current: createOpenMeteoSource(sourceContext),
            hourly: createOpenMeteoSource(sourceContext),
            daily: createOpenMeteoSource(sourceContext)
        },
        errors: []
    });
}

function normalizeLocation(rawData, location) {
    return {
        id: location.id ?? null,
        name: location.name ?? "Position actuelle",
        label: location.label ?? buildLocationLabel(location),
        country: location.country ?? null,
        countryCode: location.countryCode ?? null,
        admin1: location.admin1 ?? null,
        latitude: Number(rawData.latitude ?? location.latitude),
        longitude: Number(rawData.longitude ?? location.longitude),
        timezone: rawData.timezone ?? location.timezone ?? "auto",
        source: location.source ?? "provider"
    };
}

function normalizeCurrentWeather(current) {
    const condition = getWeatherCondition(current.weather_code, current.is_day !== 0);

    return {
        time: current.time ?? null,
        temperature: numberOrNull(current.temperature_2m),
        apparentTemperature: numberOrNull(current.apparent_temperature),
        humidity: numberOrNull(current.relative_humidity_2m),
        precipitation: numberOrNull(current.precipitation),
        rain: numberOrNull(current.rain),
        pressure: numberOrNull(current.pressure_msl),
        cloudCover: numberOrNull(current.cloud_cover),
        weatherCode: numberOrNull(current.weather_code),
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
    const times = hourly.time ?? [];
    const startIndex = findForecastStartIndex(times, currentTime);
    const forecastHours = APP_CONFIG.api.openMeteo.forecastHours ?? 72;
    const endIndex = Math.min(startIndex + forecastHours, times.length);
    const hours = [];

    for (let index = startIndex; index < endIndex; index += 1) {
        const time = times[index];
        const code = hourly.weather_code?.[index];
        const isDay = isDayAtTime(time, daily);

        hours.push({
            time,
            temperature: numberOrNull(hourly.temperature_2m?.[index]),
            apparentTemperature: numberOrNull(hourly.apparent_temperature?.[index]),
            precipitationProbability: numberOrNull(hourly.precipitation_probability?.[index]),
            precipitation: numberOrNull(hourly.precipitation?.[index]),
            uvIndex: numberOrNull(hourly.uv_index?.[index]),
            windSpeed: numberOrNull(hourly.wind_speed_10m?.[index]),
            weatherCode: numberOrNull(code),
            condition: getWeatherCondition(code, isDay),
            isDay
        });
    }

    return hours;
}

function isDayAtTime(time, daily = []) {
    if (!time) {
        return true;
    }

    const timestamp = new Date(time).getTime();

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
        const hour = new Date(time).getHours();

        return hour >= 7 && hour < 20;
    }

    const sunrise = new Date(matchingDay.sunrise).getTime();
    const sunset = new Date(matchingDay.sunset).getTime();

    if (!Number.isFinite(sunrise) || !Number.isFinite(sunset)) {
        return true;
    }

    return timestamp >= sunrise && timestamp < sunset;
}

function normalizeDailyForecast(daily = {}, currentIsDay = true) {
    const times = daily.time ?? [];

    return times.map((date, index) => {
        const code = daily.weather_code?.[index];

        return {
            date,
            temperatureMax: numberOrNull(daily.temperature_2m_max?.[index]),
            temperatureMin: numberOrNull(daily.temperature_2m_min?.[index]),
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
            weatherCode: numberOrNull(code),
            condition: getWeatherCondition(code, currentIsDay)
        };
    });
}

function normalizeAstronomy(today) {
    if (!today) {
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
    const response = await fetch(url, { signal: options.signal });

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
    if (!currentTime) {
        return 0;
    }

    const currentDate = new Date(currentTime).getTime();
    const index = times.findIndex((time) => new Date(time).getTime() >= currentDate);

    return index >= 0 ? index : 0;
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function buildLocationLabel(location) {
    return [location.name, location.admin1, location.country]
        .filter(Boolean)
        .join(", ");
}
