export const APP_CONFIG = {
    appName: "MeteoSignal",
    version: "1.5.0",
    build: "2026-07-17",
    lastUpdated: "17 juillet 2026",
    copyright: "© 2026",
    refresh: 600000,
    theme: "auto",
    weatherProvider: "openmeteo",
    multiProvider: {
        requestTimeoutMs: 10000,
        compatibilityProviderId: "openmeteo",
        capabilities: {
            current: { primary: "openmeteo", fallbacks: [] },
            hourly: { primary: "openmeteo", fallbacks: [] },
            daily: { primary: "openmeteo", fallbacks: [] },
            astronomy: { primary: "openmeteo", fallbacks: [] },
            airQuality: { primary: "openmeteo", fallbacks: [] }
        }
    },
    defaultLocation: {
        id: "toulouse-fr",
        name: "Toulouse",
        label: "Toulouse, France",
        country: "France",
        countryCode: "FR",
        latitude: 43.6045,
        longitude: 1.444,
        timezone: "Europe/Paris",
        source: "default"
    },
    api: {
        openMeteo: {
            forecastUrl: "https://api.open-meteo.com/v1/forecast",
            geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
            airQualityUrl: "https://air-quality-api.open-meteo.com/v1/air-quality",
            forecastDays: 7,
            forecastHours: 72
        }
    }
};
