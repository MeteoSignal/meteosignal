import { createWeatherSources } from "./provenance.js?v=1.4.0-multi-api-foundation";

export function createWeatherState(overrides = {}) {
    const state = {
        provider: null,
        location: null,
        current: null,
        hourly: [],
        daily: [],
        astronomy: null,
        airQuality: null,
        updatedAt: null,
        errors: [],
        ...overrides
    };

    return {
        ...state,
        hourly: Array.isArray(state.hourly) ? [...state.hourly] : [],
        daily: Array.isArray(state.daily) ? [...state.daily] : [],
        errors: Array.isArray(state.errors) ? [...state.errors] : [],
        sources: createWeatherSources(state.sources)
    };
}

export function createWeatherError(message, details = {}) {
    return {
        message,
        details,
        createdAt: new Date().toISOString()
    };
}
