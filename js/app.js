import { APP_CONFIG } from "../config/config.js";
import { formatDuration, formatForecastDay, formatPrecipitation, formatPressure, formatSpeed, formatTemperature, formatTime, formatPercent } from "./core/formatters.js";
import { renderCurrentWeather, renderCurrentWeatherError, renderCurrentWeatherLoading } from "./components/current-weather.js";
import { getWeatherProvider } from "./services/weather-provider.js";

const provider = getWeatherProvider();

initApp();

function initApp() {
    console.log(`${APP_CONFIG.appName} v${APP_CONFIG.version} démarré`);
    renderVersion();
    loadWeatherDashboard();
    setInterval(loadWeatherDashboard, APP_CONFIG.refresh);
}

async function loadWeatherDashboard() {
    try {
        renderCurrentWeatherLoading();

        const weather = await provider.getWeather(APP_CONFIG.defaultLocation);
        renderWeatherDashboard(weather);
    } catch (error) {
        console.error(error);
        renderCurrentWeatherError("Données météo indisponibles.");
    }
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

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}
