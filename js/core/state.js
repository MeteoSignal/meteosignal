export function createWeatherState(overrides = {}) {
    return {
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
}

export function createWeatherError(message, details = {}) {
    return {
        message,
        details,
        createdAt: new Date().toISOString()
    };
}
