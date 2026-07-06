import { formatPercent, formatSpeed, formatTemperature, formatTime } from "../core/formatters.js";

const HOURLY_SELECTOR = "[data-hourly-forecast]";
const HOURLY_LIMIT = 12;
const LOADING_ITEMS = 6;

export function renderHourlyForecastLoading() {
    const items = Array.from({ length: LOADING_ITEMS }, (_, index) => ({
        time: index === 0 ? "Maintenant" : "--:--",
        icon: "--",
        temperature: "--",
        precipitation: "Pluie --",
        wind: "Vent --",
        state: "loading"
    }));

    renderHourlyItems(items, true);
}

export function renderHourlyForecast(hourly = []) {
    const hours = Array.isArray(hourly) ? hourly.slice(0, HOURLY_LIMIT) : [];

    if (hours.length === 0) {
        renderHourlyMessage("Prévisions horaires indisponibles.");
        return;
    }

    const items = hours.map((hour, index) => ({
        time: index === 0 ? "Maintenant" : formatTime(hour.time),
        icon: hour.condition?.icon ?? "--",
        label: hour.condition?.label ?? "Météo indisponible",
        tone: hour.condition?.tone ?? "unknown",
        temperature: formatTemperature(hour.temperature),
        precipitation: `Pluie ${formatPercent(hour.precipitationProbability)}`,
        wind: `Vent ${formatSpeed(hour.windSpeed)}`
    }));

    renderHourlyItems(items, false);
}

export function renderHourlyForecastError() {
    renderHourlyMessage("Prévisions horaires indisponibles.");
}

function renderHourlyItems(items, isLoading) {
    const container = document.querySelector(HOURLY_SELECTOR);

    if (!container) {
        return;
    }

    container.innerHTML = "";
    container.setAttribute("aria-busy", isLoading ? "true" : "false");

    items.forEach((item) => {
        container.appendChild(buildHourlyCard(item));
    });
}

function buildHourlyCard(item) {
    const article = document.createElement("article");
    article.className = "hourly-card";
    article.dataset.weatherTone = item.tone ?? "unknown";

    if (item.state) {
        article.dataset.forecastState = item.state;
    }

    if (item.label) {
        article.setAttribute(
            "aria-label",
            `${item.time} : ${item.label}, ${item.temperature}, ${item.precipitation}, ${item.wind}`
        );
    }

    const time = document.createElement("span");
    time.className = "hourly-time";
    time.textContent = item.time;

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = item.icon;

    const temperature = document.createElement("strong");
    temperature.className = "hourly-temperature";
    temperature.textContent = item.temperature;

    const meta = document.createElement("div");
    meta.className = "forecast-meta";
    meta.appendChild(createMetaItem(item.precipitation));
    meta.appendChild(createMetaItem(item.wind));

    article.appendChild(time);
    article.appendChild(icon);
    article.appendChild(temperature);
    article.appendChild(meta);

    return article;
}

function createMetaItem(text) {
    const element = document.createElement("span");
    element.textContent = text;
    return element;
}

function renderHourlyMessage(message) {
    const container = document.querySelector(HOURLY_SELECTOR);

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
