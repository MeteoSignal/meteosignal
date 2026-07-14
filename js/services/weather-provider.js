import { APP_CONFIG } from "../../config/config.js?v=1.4.2-w3c-feedback";
import { openMeteoProvider } from "./openmeteo.service.js?v=1.4.2-w3c-feedback";

export const WEATHER_CAPABILITIES = Object.freeze([
    "current",
    "hourly",
    "daily",
    "astronomy",
    "airQuality"
]);

export function createWeatherProviderRegistry(initialProviders = []) {
    const providers = new Map();

    const registry = {
        register(provider) {
            const normalizedProvider = normalizeProvider(provider);

            if (providers.has(normalizedProvider.id)) {
                throw new Error(`Fournisseur meteo deja enregistre : ${normalizedProvider.id}`);
            }

            providers.set(normalizedProvider.id, normalizedProvider);
            return normalizedProvider;
        },

        get(providerId) {
            return providers.get(providerId) ?? null;
        },

        list() {
            return [...providers.values()];
        },

        findByCapability(capability) {
            assertCapability(capability);
            return [...providers.values()].filter((provider) => (
                provider.enabled && provider.capabilities.includes(capability)
            ));
        },

        supports(providerId, capability) {
            assertCapability(capability);
            return providers.get(providerId)?.capabilities.includes(capability) ?? false;
        }
    };

    initialProviders.forEach((provider) => registry.register(provider));
    return Object.freeze(registry);
}

export const weatherProviderRegistry = createWeatherProviderRegistry([
    openMeteoProvider
]);

export function getWeatherProvider(providerId = APP_CONFIG.weatherProvider) {
    const provider = weatherProviderRegistry.get(providerId);

    if (!provider) {
        throw new Error(`Fournisseur meteo inconnu : ${providerId}`);
    }

    return provider;
}

export function listWeatherProviders() {
    return weatherProviderRegistry.list().map((provider) => ({
        id: provider.id,
        name: provider.name,
        enabled: provider.enabled,
        capabilities: [...provider.capabilities],
        coverage: provider.coverage,
        requiresProxy: provider.requiresProxy
    }));
}

function normalizeProvider(provider) {
    if (!provider || typeof provider !== "object") {
        throw new TypeError("Le fournisseur meteo doit etre un objet.");
    }

    const id = String(provider.id ?? "").trim();
    const name = String(provider.name ?? "").trim();

    if (!id || !name) {
        throw new TypeError("Le fournisseur meteo doit definir id et name.");
    }

    const capabilities = [...new Set(provider.capabilities ?? [])];
    capabilities.forEach(assertCapability);

    const weatherCapabilities = capabilities.filter((capability) => capability !== "airQuality");

    if (weatherCapabilities.length > 0 && typeof provider.getWeather !== "function") {
        throw new TypeError(`${id} doit implementer getWeather().`);
    }

    if (capabilities.includes("airQuality") && typeof provider.getAirQuality !== "function") {
        throw new TypeError(`${id} doit implementer getAirQuality().`);
    }

    return Object.freeze({
        ...provider,
        id,
        name,
        enabled: provider.enabled !== false,
        capabilities: Object.freeze(capabilities),
        coverage: provider.coverage ?? "global",
        requiresProxy: Boolean(provider.requiresProxy),
        attribution: provider.attribution ?? null,
        license: provider.license ?? null
    });
}

function assertCapability(capability) {
    if (!WEATHER_CAPABILITIES.includes(capability)) {
        throw new TypeError(`Capacite meteo inconnue : ${capability}`);
    }
}
