import {
    formatForecastDay,
    formatPercent,
    formatPrecipitation,
    formatTemperature,
    formatSpeed
} from "../core/formatters.js?v=1.1.5-hourly-72h";

const DAILY_SELECTOR = "[data-daily-forecast]";
const DAILY_LIMIT = 7;
const LOADING_ITEMS = 7;

export function renderDailyForecastLoading() {
    const items = Array.from({ length: LOADING_ITEMS }, () => ({
        day: "--",
        icon: "--",
        temperatureMax: "--",
        temperatureMin: "--",
        precipitation: "Pluie --",
        wind: "Vent --",
        state: "loading"
    }));

    renderDailyItems(items, true);
}

export function renderDailyForecast(daily = []) {
    const days = Array.isArray(daily) ? daily.slice(0, DAILY_LIMIT) : [];

    if (days.length === 0) {
        renderDailyMessage("Prévisions sur 7 jours indisponibles.");
        return;
    }

    const items = days.map((day) => ({
        day: formatForecastDay(day.date),
        icon: day.condition?.icon ?? "--",
        label: day.condition?.label ?? "Météo indisponible",
        tone: day.condition?.tone ?? "unknown",
        temperatureMax: formatTemperature(day.temperatureMax),
        temperatureMin: formatTemperature(day.temperatureMin),
        precipitation: formatDailyRain(day),
        wind: `Vent ${formatSpeed(day.windSpeedMax)}`
    }));

    renderDailyItems(items, false);
}

export function renderDailyForecastError() {
    renderDailyMessage("Prévisions sur 7 jours indisponibles.");
}

function renderDailyItems(items, isLoading) {
    const container = document.querySelector(DAILY_SELECTOR);

    if (!container) {
        return;
    }

    container.innerHTML = "";
    container.setAttribute("aria-busy", isLoading ? "true" : "false");

    items.forEach((item) => {
        container.appendChild(buildDailyCard(item));
    });
}

function buildDailyCard(item) {
    const article = document.createElement("article");
    article.className = "forecast-day-card";
    article.dataset.weatherTone = item.tone ?? "unknown";

    if (item.state) {
        article.dataset.forecastState = item.state;
    }

    if (item.label) {
        article.setAttribute(
            "aria-label",
            `${item.day} : ${item.label}, maximum ${item.temperatureMax}, minimum ${item.temperatureMin}, ${item.precipitation}`
        );
    }

    const header = document.createElement("header");
    header.className = "forecast-day-header";

    const day = document.createElement("span");
    day.className = "forecast-day-name";
    day.textContent = item.day;

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icon;

    header.appendChild(day);
    header.appendChild(icon);

    const temperatures = document.createElement("div");
    temperatures.className = "forecast-temperature-range";

    const max = document.createElement("strong");
    max.textContent = item.temperatureMax;

    const min = document.createElement("span");
    min.textContent = item.temperatureMin;

    temperatures.appendChild(max);
    temperatures.appendChild(min);

    const meta = document.createElement("div");
    meta.className = "forecast-meta";
    meta.appendChild(createMetaItem(item.precipitation));
    meta.appendChild(createMetaItem(item.wind));

    article.appendChild(header);
    article.appendChild(temperatures);
    article.appendChild(meta);

    return article;
}

function formatDailyRain(day) {
    const probability = Number.isFinite(Number(day.precipitationProbabilityMax))
        ? `Pluie ${formatPercent(day.precipitationProbabilityMax)}`
        : null;
    const amount = Number.isFinite(Number(day.precipitationSum))
        ? formatPrecipitation(day.precipitationSum)
        : null;

    return [probability, amount].filter(Boolean).join(" - ") || "Pluie --";
}

function createMetaItem(text) {
    const element = document.createElement("span");
    element.textContent = text;
    return element;
}

function renderDailyMessage(message) {
    const container = document.querySelector(DAILY_SELECTOR);

    if (!container) {
        return;
    }

    container.innerHTML = "";
    container.setAttribute("aria-busy", "false");

    const element = document.createElement("p");
    element.className = "forecast-message";
    element.textContent = message;

    container.appendChild(element);
}
