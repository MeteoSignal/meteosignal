import { APP_CONFIG } from "../config/config.js";
import { readActiveLocation, saveActiveLocation } from "./core/storage.js";
import { renderAstronomy, renderAstronomyError, renderAstronomyLoading } from "./components/astronomy.js";
import { renderDailyForecast, renderDailyForecastError, renderDailyForecastLoading } from "./components/daily-forecast.js";
import { initFavorites, renderFavoriteButton } from "./components/favorites.js";
import { renderCurrentWeather, renderCurrentWeatherError, renderCurrentWeatherLoading } from "./components/current-weather.js";
import { renderHourlyForecast, renderHourlyForecastError, renderHourlyForecastLoading } from "./components/hourly-forecast.js";
import { initSearch, updateSearchInput } from "./components/search.js";
import { renderWeatherCards, renderWeatherCardsError, renderWeatherCardsLoading } from "./components/weather-cards.js";
import { fetchAirQuality } from "./services/air-quality.service.js";
import { getCurrentPositionLocation } from "./services/geolocation.service.js";
import { getWeatherProvider } from "./services/weather-provider.js";

const provider = getWeatherProvider();
const DASHBOARD_SELECTOR = "[data-dashboard]";
let activeLocation = readActiveLocation(APP_CONFIG.defaultLocation);
let dashboardRequestId = 0;
let isDashboardLoading = false;

initApp();

function initApp() {
    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} démarré`);
    initSearch({
        onLocationSelect: handleLocationSelect,
        onError: showInteractionError
    });
    initFavorites({
        getActiveLocation: () => activeLocation,
        onError: showInteractionError
    });
    bindGeolocationButton();
    updateSearchInput(activeLocation);
    renderFavoriteButton(activeLocation);
    renderVersion();
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
            renderDashboardLoading();
        } else {
            setDashboardBusy(true, "Mise à jour météo en arrière-plan.");
        }

        const [weather, airQuality] = await Promise.all([
            provider.getWeather(requestedLocation),
            loadAirQuality(requestedLocation)
        ]);

        if (!isCurrentDashboardRequest(requestId, requestedLocation)) {
            return;
        }

        const weatherWithAirQuality = {
            ...weather,
            airQuality
        };

        renderWeatherDashboard(weatherWithAirQuality);
        renderFavoriteButton(activeLocation);
        setDashboardBusy(false, `Météo mise à jour pour ${weather.location.name}.`);
    } catch (error) {
        if (!isCurrentDashboardRequest(requestId, requestedLocation)) {
            return;
        }

        console.warn(error);

        if (showLoading) {
            renderDashboardError("Données météo indisponibles.");
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

function setActiveLocation(location) {
    activeLocation = saveActiveLocation(location) ?? location;
    updateSearchInput(activeLocation);
    renderFavoriteButton(activeLocation);
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
    renderCurrentWeather(weather);
    renderWeatherCards(weather);
    renderHourlyForecast(weather.hourly);
    renderDailyForecast(weather.daily);
    renderAstronomy(weather.astronomy);
}

function renderDashboardLoading() {
    setDashboardBusy(true, "Chargement de la météo.");
    renderCurrentWeatherLoading();
    renderWeatherCardsLoading();
    renderHourlyForecastLoading();
    renderDailyForecastLoading();
    renderAstronomyLoading();
}

function renderDashboardError(message) {
    setDashboardBusy(false, message);
    renderCurrentWeatherError(message);
    renderWeatherCardsError();
    renderHourlyForecastError();
    renderDailyForecastError();
    renderAstronomyError();
}

async function loadAirQuality(location) {
    try {
        return await fetchAirQuality(location);
    } catch (error) {
        console.warn(error);
        return null;
    }
}

function renderVersion() {
    setText(
        "#version",
        `${APP_CONFIG.appName} • v${APP_CONFIG.version} • Build ${APP_CONFIG.build} • ${APP_CONFIG.copyright}`
    );
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
