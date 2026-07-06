import { APP_CONFIG } from "../config/config.js";
import { formatDuration, formatTime } from "./core/formatters.js";
import { readActiveLocation, saveActiveLocation } from "./core/storage.js";
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
let activeLocation = readActiveLocation(APP_CONFIG.defaultLocation);

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
    setInterval(loadWeatherDashboard, APP_CONFIG.refresh);
}

async function loadWeatherDashboard() {
    try {
        renderCurrentWeatherLoading();
        renderWeatherCardsLoading();
        renderHourlyForecastLoading();
        renderDailyForecastLoading();

        const [weather, airQuality] = await Promise.all([
            provider.getWeather(activeLocation),
            loadAirQuality(activeLocation)
        ]);
        const weatherWithAirQuality = {
            ...weather,
            airQuality
        };

        renderWeatherDashboard(weatherWithAirQuality);
        renderFavoriteButton(activeLocation);
    } catch (error) {
        console.error(error);
        renderCurrentWeatherError("Données météo indisponibles.");
        renderWeatherCardsError();
        renderHourlyForecastError();
        renderDailyForecastError();
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

async function loadAirQuality(location) {
    try {
        return await fetchAirQuality(location);
    } catch (error) {
        console.warn(error);
        return null;
    }
}

function renderAstronomy(astronomy) {
    if (!astronomy) {
        return;
    }

    setText("#sunrise", formatTime(astronomy.sunrise));
    setText("#sunset", formatTime(astronomy.sunset));
    setText("#daylight-duration", formatDuration(astronomy.daylightDuration));
}

function renderVersion() {
    setText(
        "#version",
        `${APP_CONFIG.appName} • v${APP_CONFIG.version} • Build ${APP_CONFIG.build} • ${APP_CONFIG.copyright}`
    );
}

function showInteractionError(error) {
    console.error(error);
    setText("#hero-status", "Action indisponible");
    setText("#search-status", error.message ?? "Action indisponible.");
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}
