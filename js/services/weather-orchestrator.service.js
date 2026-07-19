import { APP_CONFIG } from "../../config/config.js?v=1.5.2-location-sync";
import {
    createSourceMetadata,
    createWeatherSources,
    markSourceAsFallback,
    WEATHER_SOURCE_BLOCKS
} from "../core/provenance.js?v=1.5.2-location-sync";
import { createWeatherError, createWeatherState } from "../core/state.js?v=1.5.2-location-sync";
import {
    WEATHER_CAPABILITIES,
    weatherProviderRegistry
} from "./weather-provider.js?v=1.5.2-location-sync";

const WEATHER_ENDPOINT_CAPABILITIES = Object.freeze([
    "current",
    "hourly",
    "daily",
    "astronomy"
]);

export class WeatherOrchestrationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "WeatherOrchestrationError";
        this.code = details.code ?? "ORCHESTRATOR_ERROR";
        this.details = details;
    }
}

export function createWeatherOrchestrator(options = {}) {
    const registry = options.registry ?? weatherProviderRegistry;
    const configuredPolicy = options.policy ?? APP_CONFIG.multiProvider;
    const compatibilityProviderId = options.compatibilityProviderId
        ?? configuredPolicy?.compatibilityProviderId
        ?? APP_CONFIG.weatherProvider;
    const defaultTimeoutMs = options.timeoutMs
        ?? configuredPolicy?.requestTimeoutMs
        ?? 10000;
    const now = typeof options.now === "function" ? options.now : () => new Date();

    return Object.freeze({
        async getWeather(location, requestOptions = {}) {
            try {
                const policy = normalizePolicy(configuredPolicy);
                return await loadByPolicy({
                    registry,
                    policy,
                    location,
                    signal: requestOptions.signal,
                    timeoutMs: requestOptions.timeoutMs ?? defaultTimeoutMs,
                    now
                });
            } catch (error) {
                if (isAbortError(error) || !(error instanceof WeatherOrchestrationError)) {
                    throw error;
                }

                return loadCompatibilityProvider({
                    registry,
                    providerId: compatibilityProviderId,
                    location,
                    signal: requestOptions.signal,
                    timeoutMs: requestOptions.timeoutMs ?? defaultTimeoutMs,
                    now,
                    orchestrationError: error
                });
            }
        }
    });
}

export const weatherOrchestrator = createWeatherOrchestrator();

async function loadByPolicy({ registry, policy, location, signal, timeoutMs, now }) {
    assertRequestNotAborted(signal);

    const unresolved = new Set(WEATHER_CAPABILITIES);
    const candidateIndexes = new Map(WEATHER_CAPABILITIES.map((capability) => [capability, 0]));
    const data = {};
    const sources = createWeatherSources();
    const errors = [];
    let resolvedLocation = location;
    let updatedAt = null;
    let endpointCalls = 0;

    while (unresolved.size > 0) {
        const groups = new Map();

        for (const capability of unresolved) {
            const candidates = policy.capabilities[capability];
            const candidateIndex = candidateIndexes.get(capability) ?? 0;
            const providerId = candidates[candidateIndex];

            if (!providerId) {
                unresolved.delete(capability);
                continue;
            }

            candidateIndexes.set(capability, candidateIndex + 1);
            const provider = registry.get(providerId);

            if (!provider) {
                throw new WeatherOrchestrationError(
                    `Fournisseur configure introuvable : ${providerId}`,
                    { code: "PROVIDER_NOT_REGISTERED", providerId, capability }
                );
            }

            if (!provider.enabled || !provider.capabilities.includes(capability)) {
                errors.push(createCapabilityError({
                    providerId,
                    capability,
                    code: "CAPABILITY_UNAVAILABLE",
                    message: `${provider.name} ne fournit pas ${capability}.`,
                    now
                }));
                continue;
            }

            const endpoint = capability === "airQuality" ? "airQuality" : "weather";
            const groupKey = `${providerId}:${endpoint}`;
            const group = groups.get(groupKey) ?? {
                provider,
                endpoint,
                capabilities: [],
                fallbackByCapability: new Map()
            };

            group.capabilities.push(capability);
            group.fallbackByCapability.set(capability, candidateIndex > 0);
            groups.set(groupKey, group);
        }

        if (groups.size === 0) {
            break;
        }

        const groupResults = await Promise.all([...groups.values()].map(async (group) => {
            endpointCalls += 1;
            return invokeProviderGroup({ group, location, signal, timeoutMs });
        }));

        assertRequestNotAborted(signal);

        groupResults.forEach(({ group, result, error }) => {
            group.capabilities.forEach((capability) => {
                if (error) {
                    errors.push(createCapabilityError({
                        providerId: group.provider.id,
                        capability,
                        code: error.code ?? "PROVIDER_REQUEST_FAILED",
                        message: error.message,
                        status: error.status,
                        now
                    }));
                    return;
                }

                if (!hasCapabilityData(result, capability)) {
                    errors.push(createCapabilityError({
                        providerId: group.provider.id,
                        capability,
                        code: "PROVIDER_DATA_MISSING",
                        message: `${group.provider.name} n'a retourne aucune donnee pour ${capability}.`,
                        now
                    }));
                    return;
                }

                data[capability] = cloneCapabilityData(result[capability]);
                unresolved.delete(capability);

                if (WEATHER_SOURCE_BLOCKS.includes(capability)) {
                    const source = result.sources?.[capability]
                        ?? createProviderSource(group.provider, now, ["source-metadata-missing"]);
                    sources[capability] = group.fallbackByCapability.get(capability)
                        ? markSourceAsFallback(source, "provider-fallback")
                        : createSourceMetadata(source);
                }
            });

            if (result?.location && resolvedLocation === location) {
                resolvedLocation = { ...result.location };
            }

            updatedAt ??= result?.updatedAt ?? null;
        });
    }

    if (endpointCalls === 0) {
        throw new WeatherOrchestrationError(
            "La politique multi-fournisseur n'a produit aucun appel.",
            { code: "EMPTY_PROVIDER_POLICY" }
        );
    }

    return createWeatherState({
        provider: sources.current?.providerId
            ?? sources.hourly?.providerId
            ?? sources.daily?.providerId
            ?? null,
        location: resolvedLocation ? { ...resolvedLocation } : null,
        current: data.current ?? null,
        hourly: data.hourly ?? [],
        daily: data.daily ?? [],
        astronomy: data.astronomy ?? null,
        airQuality: data.airQuality ?? null,
        updatedAt,
        sources,
        errors
    });
}

async function loadCompatibilityProvider({
    registry,
    providerId,
    location,
    signal,
    timeoutMs,
    now,
    orchestrationError
}) {
    const provider = registry.get(providerId);

    if (!provider) {
        throw orchestrationError;
    }

    const groups = [];
    const weatherCapabilities = WEATHER_ENDPOINT_CAPABILITIES.filter((capability) => (
        provider.capabilities.includes(capability)
    ));

    if (weatherCapabilities.length > 0) {
        groups.push({ provider, endpoint: "weather", capabilities: weatherCapabilities });
    }

    if (provider.capabilities.includes("airQuality")) {
        groups.push({ provider, endpoint: "airQuality", capabilities: ["airQuality"] });
    }

    const settled = await Promise.all(groups.map((group) => (
        invokeProviderGroup({ group, location, signal, timeoutMs })
    )));
    assertRequestNotAborted(signal);

    const data = {};
    const sources = createWeatherSources();
    const errors = [createWeatherError(orchestrationError.message, {
        providerId,
        capability: "orchestrator",
        code: orchestrationError.code,
        recoverable: true
    })];
    let resolvedLocation = location;
    let updatedAt = null;

    settled.forEach(({ group, result, error }) => {
        group.capabilities.forEach((capability) => {
            if (error || !hasCapabilityData(result, capability)) {
                errors.push(createCapabilityError({
                    providerId,
                    capability,
                    code: error?.code ?? "PROVIDER_DATA_MISSING",
                    message: error?.message ?? `Donnees ${capability} indisponibles.`,
                    status: error?.status,
                    now
                }));
                return;
            }

            data[capability] = cloneCapabilityData(result[capability]);

            if (WEATHER_SOURCE_BLOCKS.includes(capability)) {
                const source = result.sources?.[capability]
                    ?? createProviderSource(provider, now, ["source-metadata-missing"]);
                sources[capability] = markSourceAsFallback(
                    source,
                    "orchestrator-compatibility-fallback"
                );
            }
        });

        resolvedLocation = result?.location ? { ...result.location } : resolvedLocation;
        updatedAt ??= result?.updatedAt ?? null;
    });

    return createWeatherState({
        provider: provider.id,
        location: resolvedLocation ? { ...resolvedLocation } : null,
        current: data.current ?? null,
        hourly: data.hourly ?? [],
        daily: data.daily ?? [],
        astronomy: data.astronomy ?? null,
        airQuality: data.airQuality ?? null,
        updatedAt,
        sources,
        errors
    });
}

async function invokeProviderGroup({ group, location, signal, timeoutMs }) {
    const requestScope = createRequestScope(signal, timeoutMs);

    try {
        const method = group.endpoint === "airQuality"
            ? group.provider.getAirQuality
            : group.provider.getWeather;
        const result = await method.call(group.provider, location, {
            capabilities: [...group.capabilities],
            signal: requestScope.signal
        });

        return { group, result, error: null };
    } catch (error) {
        if (signal?.aborted) {
            throw normalizeAbortReason(signal.reason);
        }

        return {
            group,
            result: null,
            error: normalizeProviderError(error, requestScope.didTimeout())
        };
    } finally {
        requestScope.cleanup();
    }
}

function createRequestScope(externalSignal, timeoutMs) {
    const controller = new AbortController();
    let timedOut = false;
    let timeoutId = null;

    const abortFromExternalSignal = () => {
        controller.abort(normalizeAbortReason(externalSignal?.reason));
    };

    if (externalSignal?.aborted) {
        abortFromExternalSignal();
    } else if (externalSignal) {
        externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
    }

    if (Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0) {
        timeoutId = setTimeout(() => {
            timedOut = true;
            const error = new Error("Le fournisseur meteo a depasse le delai autorise.");
            error.name = "TimeoutError";
            error.code = "PROVIDER_TIMEOUT";
            controller.abort(error);
        }, Number(timeoutMs));
    }

    return {
        signal: controller.signal,
        didTimeout: () => timedOut,
        cleanup() {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            externalSignal?.removeEventListener?.("abort", abortFromExternalSignal);
        }
    };
}

function normalizePolicy(policy) {
    const capabilityPolicy = policy?.capabilities;

    if (!capabilityPolicy || typeof capabilityPolicy !== "object") {
        throw new WeatherOrchestrationError(
            "Politique multi-fournisseur invalide.",
            { code: "INVALID_PROVIDER_POLICY" }
        );
    }

    const normalizedCapabilities = {};

    WEATHER_CAPABILITIES.forEach((capability) => {
        const rule = capabilityPolicy[capability];
        const primary = String(rule?.primary ?? "").trim();

        if (!primary) {
            throw new WeatherOrchestrationError(
                `Fournisseur principal absent pour ${capability}.`,
                { code: "INVALID_PROVIDER_POLICY", capability }
            );
        }

        normalizedCapabilities[capability] = [...new Set([
            primary,
            ...(Array.isArray(rule.fallbacks) ? rule.fallbacks : [])
        ].map((providerId) => String(providerId).trim()).filter(Boolean))];
    });

    return { capabilities: normalizedCapabilities };
}

function hasCapabilityData(result, capability) {
    if (!result) {
        return false;
    }

    if (capability === "hourly" || capability === "daily") {
        return Array.isArray(result[capability]) && result[capability].length > 0;
    }

    return result[capability] !== null && result[capability] !== undefined;
}

function cloneCapabilityData(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneRecord(item));
    }

    return cloneRecord(value);
}

function cloneRecord(value) {
    if (!value || typeof value !== "object") {
        return value;
    }

    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
        key,
        Array.isArray(item)
            ? item.map((entry) => cloneRecord(entry))
            : cloneRecord(item)
    ]));
}

function createProviderSource(provider, now, qualityFlags = []) {
    return createSourceMetadata({
        providerId: provider.id,
        type: "forecast",
        fetchedAt: now().toISOString(),
        attribution: provider.attribution,
        license: provider.license,
        qualityFlags
    });
}

function createCapabilityError({ providerId, capability, code, message, status = null, now }) {
    return {
        ...createWeatherError(message, {
            providerId,
            capability,
            code,
            status: status ?? null,
            recoverable: true
        }),
        createdAt: now().toISOString()
    };
}

function normalizeProviderError(error, didTimeout) {
    if (didTimeout) {
        const timeoutError = new Error("Le fournisseur meteo a depasse le delai autorise.");
        timeoutError.code = "PROVIDER_TIMEOUT";
        timeoutError.status = null;
        return timeoutError;
    }

    const normalizedError = error instanceof Error
        ? error
        : new Error("Le fournisseur meteo est indisponible.");
    normalizedError.code ??= "PROVIDER_REQUEST_FAILED";
    normalizedError.status ??= normalizedError.details?.status ?? null;
    return normalizedError;
}

function assertRequestNotAborted(signal) {
    if (signal?.aborted) {
        throw normalizeAbortReason(signal.reason);
    }
}

function normalizeAbortReason(reason) {
    if (reason instanceof Error) {
        if (!reason.name || reason.name === "Error") {
            reason.name = "AbortError";
        }
        return reason;
    }

    const error = new Error("La requete meteo a ete annulee.");
    error.name = "AbortError";
    error.code = "REQUEST_ABORTED";
    return error;
}

function isAbortError(error) {
    return error?.name === "AbortError" || error?.code === "REQUEST_ABORTED";
}
