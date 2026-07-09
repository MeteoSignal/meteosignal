import { APP_CONFIG } from "../../config/config.js?v=1.2.0-weather-alerts";
import { openMeteoProvider } from "./openmeteo.service.js?v=1.2.0-weather-alerts";

const WEATHER_PROVIDERS = {
    [openMeteoProvider.id]: openMeteoProvider
};

export function getWeatherProvider(providerId = APP_CONFIG.weatherProvider) {
    const provider = WEATHER_PROVIDERS[providerId];

    if (!provider) {
        throw new Error(`Fournisseur météo inconnu : ${providerId}`);
    }

    return provider;
}

export function listWeatherProviders() {
    return Object.values(WEATHER_PROVIDERS).map((provider) => ({
        id: provider.id,
        name: provider.name
    }));
}
