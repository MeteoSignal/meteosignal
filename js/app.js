import { APP_CONFIG } from "../config/config.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { readActiveLocation, saveActiveLocation } from "./core/storage.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { renderAstronomy, renderAstronomyError, renderAstronomyLoading } from "./components/astronomy.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { renderDailyForecast, renderDailyForecastError, renderDailyForecastLoading } from "./components/daily-forecast.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { initFavorites, renderFavoriteButton, renderFavoritesList } from "./components/favorites.js?v=1.4.1-p1c-live-semantics";
import { renderCurrentWeather, renderCurrentWeatherError, renderCurrentWeatherLoading } from "./components/current-weather.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { initHourlyForecast, renderHourlyForecast, renderHourlyForecastError, renderHourlyForecastLoading } from "./components/hourly-forecast.js?v=1.4.1-p1c-live-semantics";
import { initNavigation } from "./components/navigation.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { initSearch, updateSearchInput } from "./components/search.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { renderWeatherAlerts, renderWeatherAlertsError, renderWeatherAlertsLoading } from "./components/weather-alerts.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { renderWeatherCards, renderWeatherCardsError, renderWeatherCardsLoading } from "./components/weather-cards.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { renderDataSources, renderDataSourcesEmpty } from "./components/data-sources.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { getCurrentPositionLocation } from "./services/geolocation.service.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { weatherOrchestrator } from "./services/weather-orchestrator.service.js?v=1.4.1-search-geocoding-reliability-hotfix";

const DASHBOARD_SELECTOR = "[data-dashboard]";
let activeLocation = readActiveLocation(APP_CONFIG.defaultLocation);
let weatherRefreshController = null;
const weatherDashboardLoader = createWeatherDashboardLoader({
    getActiveLocation: () => activeLocation,
    getWeather: (location, requestOptions) => weatherOrchestrator.getWeather(location, requestOptions),
    onStart({ location, showLoading }) {
        if (showLoading) {
            renderDashboardLoading(location);
        } else {
            setDashboardBusy(true, "Mise à jour météo en arrière-plan.");
        }
    },
    onSuccess(weather) {
        renderWeatherDashboard(weather);
        renderFavoriteButton(activeLocation);
        renderFavoritesList(activeLocation);
        const statusMessage = weather.errors.length > 0
            ? `Météo partiellement mise à jour pour ${weather.location.name}.`
            : `Météo mise à jour pour ${weather.location.name}.`;
        setDashboardBusy(false, statusMessage);
        weatherRefreshController?.recordSuccess();
    },
    onError(error, { location, showLoading }) {
        console.warn(error);

        if (showLoading) {
            renderDashboardError("Données météo indisponibles.", location);
        } else {
            setDashboardBusy(false, "Mise à jour météo différée.");
        }
    }
});
weatherRefreshController = createWeatherRefreshController({
    refreshMs: APP_CONFIG.refresh,
    getVisibilityState: () => document.visibilityState,
    isRequestActive: () => weatherDashboardLoader.getActiveSignal() !== null,
    loadWeather: (options) => loadWeatherDashboard(options)
});

if (typeof document !== "undefined") {
    initApp();
}

function initApp() {
    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} démarré`);
    initNavigation();
    initSearch({
        onLocationSelect: handleLocationSelect,
        onError: reportSearchError
    });
    initHourlyForecast({
        onRangeChange: handleHourlyRangeChange
    });
    initFavorites({
        getActiveLocation: () => activeLocation,
        onLocationSelect: handleFavoriteLocationSelect,
        onToggle: handleFavoriteToggle,
        onRemove: handleFavoriteRemove,
        onError: showInteractionError
    });
    bindGeolocationButton();
    updateSearchInput(activeLocation);
    renderFavoriteButton(activeLocation);
    renderFavoritesList(activeLocation);
    renderProjectStatus();
    loadWeatherDashboard();
    setInterval(() => {
        void weatherRefreshController.handleAutomaticRefresh();
    }, APP_CONFIG.refresh);
    document.addEventListener("visibilitychange", () => {
        void weatherRefreshController.handleVisibilityChange();
    });
}

function loadWeatherDashboard(options) {
    return weatherDashboardLoader.load(options);
}

export function createWeatherDashboardLoader({
    getActiveLocation,
    getWeather,
    onStart = () => {},
    onSuccess = () => {},
    onError = () => {}
}) {
    if (typeof getActiveLocation !== "function" || typeof getWeather !== "function") {
        throw new TypeError("Le chargement météo nécessite une localisation active et un orchestrateur.");
    }

    let latestRequestId = 0;
    let isLoading = false;
    let activeController = null;

    async function load({ showLoading = true } = {}) {
        if (isLoading && !showLoading) {
            return;
        }

        activeController?.abort();
        const controller = new AbortController();
        activeController = controller;
        const requestId = latestRequestId + 1;
        const requestedLocation = getActiveLocation();
        latestRequestId = requestId;
        isLoading = true;

        const isCurrentRequest = () => (
            requestId === latestRequestId
            && requestedLocation === getActiveLocation()
        );

        try {
            onStart({ location: requestedLocation, showLoading });
            const weather = await getWeather(requestedLocation, { signal: controller.signal });

            if (!isCurrentRequest()) {
                return;
            }

            onSuccess(weather, { location: requestedLocation, showLoading });
        } catch (error) {
            if (!isCurrentRequest() || isAbortError(error)) {
                return;
            }

            onError(error, { location: requestedLocation, showLoading });
        } finally {
            if (activeController === controller) {
                activeController = null;
            }

            if (requestId === latestRequestId) {
                isLoading = false;
            }
        }
    }

    return Object.freeze({
        load,
        getActiveSignal: () => activeController?.signal ?? null
    });
}

export function createWeatherRefreshController({
    refreshMs,
    getVisibilityState,
    isRequestActive,
    loadWeather,
    now = () => Date.now()
}) {
    const refreshInterval = Number(refreshMs);

    if (!Number.isFinite(refreshInterval) || refreshInterval <= 0) {
        throw new TypeError("La fréquence d'actualisation météo doit être positive.");
    }

    if (typeof getVisibilityState !== "function"
        || typeof isRequestActive !== "function"
        || typeof loadWeather !== "function") {
        throw new TypeError("Le contrôleur d'actualisation météo est incomplet.");
    }

    let lastSuccessfulRenderAt = null;
    let missedRefresh = false;
    let refreshInFlight = false;

    function recordSuccess(value = now()) {
        const timestamp = value instanceof Date ? value.getTime() : Number(value);

        if (!Number.isFinite(timestamp)) {
            throw new TypeError("La date de fraîcheur météo est invalide.");
        }

        lastSuccessfulRenderAt = timestamp;
        missedRefresh = false;
    }

    function isDataStale() {
        if (lastSuccessfulRenderAt === null) {
            return true;
        }

        return Number(now()) - lastSuccessfulRenderAt >= refreshInterval;
    }

    async function requestRefresh() {
        if (refreshInFlight || isRequestActive()) {
            return false;
        }

        refreshInFlight = true;

        try {
            await loadWeather({ showLoading: false });
            return true;
        } finally {
            refreshInFlight = false;
        }
    }

    async function handleAutomaticRefresh() {
        if (getVisibilityState() !== "visible") {
            missedRefresh = true;
            return false;
        }

        return requestRefresh();
    }

    async function handleVisibilityChange() {
        if (getVisibilityState() !== "visible" || (!missedRefresh && !isDataStale())) {
            return false;
        }

        const started = await requestRefresh();

        if (started) {
            missedRefresh = false;
        }

        return started;
    }

    return Object.freeze({
        handleAutomaticRefresh,
        handleVisibilityChange,
        recordSuccess,
        getLastSuccessAt: () => lastSuccessfulRenderAt
    });
}

async function handleLocationSelect(location) {
    setActiveLocation(location);
    await loadWeatherDashboard();
}

async function handleFavoriteLocationSelect(location) {
    setActiveLocation(location);
    setText("#app-status", `${location.name} sélectionnée depuis les villes enregistrées.`);
    await loadWeatherDashboard();
}

function handleFavoriteToggle({ isFavorite, location }) {
    const action = isFavorite ? "ajoutée aux villes enregistrées" : "retirée des villes enregistrées";
    setText("#app-status", `${location.name} ${action}.`);
}

function handleFavoriteRemove({ location, removedActiveLocation }) {
    const suffix = removedActiveLocation ? " La ville affichée reste active." : "";
    setText("#app-status", `${location.name} supprimée des villes enregistrées.${suffix}`);
}

function handleHourlyRangeChange({ label }) {
    setText("#app-status", `Prévisions horaires affichées pour la plage ${label}.`);
}

function setActiveLocation(location) {
    activeLocation = saveActiveLocation(location) ?? location;
    updateSearchInput(activeLocation);
    renderFavoriteButton(activeLocation);
    renderFavoritesList(activeLocation);
}

function bindGeolocationButton() {
    const button = document.querySelector("#geolocation-button");

    if (!button) {
        return;
    }

    button.addEventListener("click", async () => {
        try {
            button.disabled = true;
            const location = await getCurrentPositionLocation();
            await handleLocationSelect(location);
        } catch (error) {
            showInteractionError(error);
        } finally {
            button.disabled = false;
        }
    });
}

function renderWeatherDashboard(weather) {
    if (weather.current) {
        renderCurrentWeather(weather);
        renderWeatherCards(weather);
    } else {
        renderCurrentWeatherError("Conditions actuelles indisponibles.", weather.location);
        renderWeatherCardsError();
    }

    Array.isArray(weather.hourly) && weather.hourly.length > 0
        ? renderHourlyForecast(weather.hourly)
        : renderHourlyForecastError();

    Array.isArray(weather.daily) && weather.daily.length > 0
        ? renderDailyForecast(weather.daily)
        : renderDailyForecastError();

    weather.astronomy
        ? renderAstronomy(weather.astronomy)
        : renderAstronomyError();

    weather.current || weather.daily.length > 0 || weather.hourly.length > 0
        ? renderWeatherAlerts(weather)
        : renderWeatherAlertsError();

    renderDataSources(weather);
}

function renderDashboardLoading(location) {
    setDashboardBusy(true, "Chargement de la météo.");
    renderCurrentWeatherLoading(location);
    renderWeatherCardsLoading();
    renderHourlyForecastLoading();
    renderDailyForecastLoading();
    renderAstronomyLoading();
    renderWeatherAlertsLoading();
    renderDataSourcesEmpty();
}

function renderDashboardError(message, location) {
    setDashboardBusy(false, message);
    renderCurrentWeatherError(message, location);
    renderWeatherCardsError();
    renderHourlyForecastError();
    renderDailyForecastError();
    renderAstronomyError();
    renderWeatherAlertsError();
    renderDataSourcesEmpty();
}

function renderProjectStatus() {
    const lastUpdated = APP_CONFIG.lastUpdated || formatBuildDate(APP_CONFIG.build);

    setText("#project-status-version", `Version : v${APP_CONFIG.version}`);
    setText("#project-status-build", `Build : ${APP_CONFIG.build}`);
    setText("#project-status-updated", `Dernière mise à jour : ${lastUpdated}`);
    setText("#project-status-copyright", `${APP_CONFIG.appName} ${APP_CONFIG.copyright}`);
}

function formatBuildDate(buildDate) {
    const [year, month, day] = String(buildDate).split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (!year || !month || !day || Number.isNaN(date.getTime())) {
        return "08 juillet 2026";
    }

    return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function showInteractionError(error) {
    console.warn(error);
    setText("#hero-status", "Action indisponible");
    setText("#app-status", error.message ?? "Action indisponible.");
}

function reportSearchError(error) {
    console.warn(error);
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}

function setDashboardBusy(isBusy, statusMessage) {
    const dashboard = document.querySelector(DASHBOARD_SELECTOR);

    if (dashboard) {
        dashboard.setAttribute("aria-busy", String(isBusy));
    }

    if (statusMessage) {
        setText("#app-status", statusMessage);
    }
}

function isAbortError(error) {
    return error?.name === "AbortError"
        || error?.code === "ABORT_ERR"
        || error?.code === "REQUEST_ABORTED";
}
