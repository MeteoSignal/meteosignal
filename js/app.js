import { APP_CONFIG } from "../config/config.js";
import { formatDuration, formatForecastDay, formatPrecipitation, formatPressure, formatSpeed, formatTemperature, formatTime, formatPercent } from "./core/formatters.js";
import { readActiveLocation, saveActiveLocation } from "./core/storage.js";
import { initFavorites, renderFavoriteButton } from "./components/favorites.js";
import { renderCurrentWeather, renderCurrentWeatherError, renderCurrentWeatherLoading } from "./components/current-weather.js";
import { initSearch, updateSearchInput } from "./components/search.js";
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

        const weather = await provider.getWeather(activeLocation);
        renderWeatherDashboard(weather);
        renderFavoriteButton(activeLocation);
    } catch (error) {
        console.error(error);
        renderCurrentWeatherError("Données météo indisponibles.");
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
    renderHourlyPreview(weather.hourly);
    renderDailyForecast(weather.daily);
    renderAstronomy(weather.astronomy);
}

function renderWeatherCards(weather) {
    const current = weather.current;

    setText("#wind", formatSpeed(current.wind.speed));
    setText("#humidity", formatPercent(current.humidity));
    setText("#pressure", formatPressure(current.pressure));
    setText("#precipitation", formatPrecipitation(current.precipitation));
}

function renderHourlyPreview(hourly) {
    const container = document.querySelector(".hourly-strip");

    if (!container || hourly.length === 0) {
        return;
    }

    const previewHours = hourly.slice(0, 4);
    container.innerHTML = "";

    previewHours.forEach((hour) => {
        const card = document.createElement("article");
        card.innerHTML = `
            <span>${formatTime(hour.time)}</span>
            <strong>${formatTemperature(hour.temperature)}</strong>
        `;
        container.appendChild(card);
    });
}

function renderDailyForecast(daily) {
    const container = document.querySelector("#forecast");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    daily.slice(0, 7).forEach((day) => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <span>${formatForecastDay(day.date)}</span>
            <strong>${day.condition.icon}</strong>
            <span>${formatTemperature(day.temperatureMax)}</span>
        `;
        container.appendChild(card);
    });
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
