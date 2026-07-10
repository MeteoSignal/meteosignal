import { APP_CONFIG } from "../config/config.js?v=1.4.1-search-geocoding-reliability-release";
import { readActiveLocation, saveActiveLocation } from "./core/storage.js?v=1.4.1-search-geocoding-reliability-release";
import { renderAstronomy, renderAstronomyError, renderAstronomyLoading } from "./components/astronomy.js?v=1.4.1-search-geocoding-reliability-release";
import { renderDailyForecast, renderDailyForecastError, renderDailyForecastLoading } from "./components/daily-forecast.js?v=1.4.1-search-geocoding-reliability-release";
import { initFavorites, renderFavoriteButton, renderFavoritesList } from "./components/favorites.js?v=1.4.1-search-geocoding-reliability-release";
import { renderCurrentWeather, renderCurrentWeatherError, renderCurrentWeatherLoading } from "./components/current-weather.js?v=1.4.1-search-geocoding-reliability-release";
import { renderHourlyForecast, renderHourlyForecastError, renderHourlyForecastLoading } from "./components/hourly-forecast.js?v=1.4.1-search-geocoding-reliability-release";
import { initNavigation } from "./components/navigation.js?v=1.4.1-search-geocoding-reliability-release";
import { initSearch, updateSearchInput } from "./components/search.js?v=1.4.1-search-geocoding-reliability-release";
import { renderWeatherAlerts, renderWeatherAlertsError, renderWeatherAlertsLoading } from "./components/weather-alerts.js?v=1.4.1-search-geocoding-reliability-release";
import { renderWeatherCards, renderWeatherCardsError, renderWeatherCardsLoading } from "./components/weather-cards.js?v=1.4.1-search-geocoding-reliability-release";
import { renderDataSources, renderDataSourcesEmpty } from "./components/data-sources.js?v=1.4.1-search-geocoding-reliability-release";
import { getCurrentPositionLocation } from "./services/geolocation.service.js?v=1.4.1-search-geocoding-reliability-release";
import { weatherOrchestrator } from "./services/weather-orchestrator.service.js?v=1.4.1-search-geocoding-reliability-release";

const DASHBOARD_SELECTOR = "[data-dashboard]";
let activeLocation = readActiveLocation(APP_CONFIG.defaultLocation);
let dashboardRequestId = 0;
let isDashboardLoading = false;

initApp();

function initApp() {
    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} démarré`);
    initNavigation();
    initSearch({
        onLocationSelect: handleLocationSelect,
        onError: showInteractionError
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
    setInterval(() => loadWeatherDashboard({ showLoading: false }), APP_CONFIG.refresh);
}

async function loadWeatherDashboard({ showLoading = true } = {}) {
    if (isDashboardLoading && !showLoading) {
        return;
    }

    const requestId = dashboardRequestId + 1;
    const requestedLocation = activeLocation;
    dashboardRequestId = requestId;
    isDashboardLoading = true;

    try {
        if (showLoading) {
            renderDashboardLoading(requestedLocation);
        } else {
            setDashboardBusy(true, "Mise à jour météo en arrière-plan.");
        }

        const weather = await weatherOrchestrator.getWeather(requestedLocation);

        if (!isCurrentDashboardRequest(requestId, requestedLocation)) {
            return;
        }

        renderWeatherDashboard(weather);
        renderFavoriteButton(activeLocation);
        renderFavoritesList(activeLocation);
        const statusMessage = weather.errors.length > 0
            ? `Météo partiellement mise à jour pour ${weather.location.name}.`
            : `Météo mise à jour pour ${weather.location.name}.`;
        setDashboardBusy(false, statusMessage);
    } catch (error) {
        if (!isCurrentDashboardRequest(requestId, requestedLocation)) {
            return;
        }

        console.warn(error);

        if (showLoading) {
            renderDashboardError("Données météo indisponibles.", requestedLocation);
        } else {
            setDashboardBusy(false, "Mise à jour météo différée.");
        }
    } finally {
        if (requestId === dashboardRequestId) {
            isDashboardLoading = false;
        }
    }
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
    setText("#search-status", error.message ?? "Action indisponible.");
    setText("#app-status", error.message ?? "Action indisponible.");
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

function isCurrentDashboardRequest(requestId, location) {
    return requestId === dashboardRequestId && location === activeLocation;
}
