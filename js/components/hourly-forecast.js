import { formatPercent, formatSpeed, formatTemperature, formatTime } from "../core/formatters.js?v=1.4.1-search-geocoding-reliability-hotfix";
import { createWeatherIconElement } from "../core/weather-icons.js?v=1.4.1-search-geocoding-reliability-hotfix";

const HOURLY_SELECTOR = "[data-hourly-forecast]";
const HOURLY_RANGE_SELECTOR = "button[data-hourly-range]";
const HOURLY_RANGE_SIZE = 24;
const HOURLY_TOTAL_LIMIT = 72;
const LOADING_ITEMS = 6;
const HOURLY_RANGES = [
    { index: 0, label: "0–24 h", start: 0, end: HOURLY_RANGE_SIZE },
    { index: 1, label: "24–48 h", start: HOURLY_RANGE_SIZE, end: HOURLY_RANGE_SIZE * 2 },
    { index: 2, label: "48–72 h", start: HOURLY_RANGE_SIZE * 2, end: HOURLY_RANGE_SIZE * 3 }
];

let activeRangeIndex = 0;
let currentHourly = [];

export function renderHourlyForecastLoading() {
    bindHourlyRangeControls();
    currentHourly = [];

    const items = Array.from({ length: LOADING_ITEMS }, (_, index) => ({
        time: index === 0 ? "Maintenant" : "--:--",
        icon: "--",
        iconId: null,
        temperature: "--",
        precipitation: "Pluie --",
        wind: "Vent --",
        state: "loading"
    }));

    syncHourlyRangeControls(true);
    renderHourlyItems(items, true);
}

export function renderHourlyForecast(hourly = []) {
    bindHourlyRangeControls();
    currentHourly = Array.isArray(hourly) ? hourly.slice(0, HOURLY_TOTAL_LIMIT) : [];

    if (currentHourly.length === 0) {
        syncHourlyRangeControls(true);
        renderHourlyMessage("Prévisions horaires indisponibles.");
        return;
    }

    ensureAvailableRange();
    renderActiveHourlyRange(false);
}

export function renderHourlyForecastError() {
    bindHourlyRangeControls();
    currentHourly = [];
    syncHourlyRangeControls(true);
    renderHourlyMessage("Prévisions horaires indisponibles.");
}

function renderActiveHourlyRange(isLoading) {
    const range = getActiveRange();
    const hours = currentHourly.slice(range.start, range.end);

    if (hours.length === 0) {
        renderHourlyMessage("Prévisions horaires indisponibles pour cette plage.");
        return;
    }

    const items = hours.map((hour, index) => ({
        time: formatHourlyTime(hour, index, range),
        icon: hour.condition?.icon ?? "--",
        iconId: hour.condition?.iconId ?? null,
        label: hour.condition?.label ?? "Météo indisponible",
        tone: hour.condition?.tone ?? "unknown",
        temperature: formatTemperature(hour.temperature),
        precipitation: `Pluie ${formatPercent(hour.precipitationProbability)}`,
        wind: `Vent ${formatSpeed(hour.windSpeed)}`
    }));

    syncHourlyRangeControls(isLoading);
    renderHourlyItems(items, isLoading, range);
}

function formatHourlyTime(hour, index, range) {
    if (range.index === 0 && index === 0) {
        return "Maintenant";
    }

    return formatTime(hour.time);
}

function renderHourlyItems(items, isLoading, range = getActiveRange()) {
    const container = document.querySelector(HOURLY_SELECTOR);

    if (!container) {
        return;
    }

    container.innerHTML = "";
    container.setAttribute("role", "list");
    container.setAttribute("aria-busy", isLoading ? "true" : "false");
    container.style.setProperty("--hourly-card-count", String(items.length || LOADING_ITEMS));
    container.dataset.hourlyTotal = String(currentHourly.length);
    container.dataset.hourlyActiveRange = range.label;
    container.dataset.hourlyRangeStart = String(range.start);
    container.dataset.hourlyRangeEnd = String(Math.min(range.end, currentHourly.length));

    items.forEach((item) => {
        container.appendChild(buildHourlyCard(item));
    });
}

function buildHourlyCard(item) {
    const card = document.createElement("div");
    card.className = "hourly-card";
    card.setAttribute("role", "listitem");
    card.dataset.weatherTone = item.tone ?? "unknown";

    if (item.state) {
        card.dataset.forecastState = item.state;
    }

    if (item.label) {
        card.setAttribute(
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
    icon.appendChild(
        createWeatherIconElement(item.iconId, item.icon, "weather-icon-img weather-icon-img--forecast")
    );

    const temperature = document.createElement("strong");
    temperature.className = "hourly-temperature";
    temperature.textContent = item.temperature;

    const meta = document.createElement("div");
    meta.className = "forecast-meta";
    meta.appendChild(createMetaItem(item.precipitation));
    meta.appendChild(createMetaItem(item.wind));

    card.appendChild(time);
    card.appendChild(icon);
    card.appendChild(temperature);
    card.appendChild(meta);

    return card;
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
    container.setAttribute("role", "status");
    container.setAttribute("aria-busy", "false");
    container.style.setProperty("--hourly-card-count", "1");
    container.dataset.hourlyTotal = String(currentHourly.length);

    const element = document.createElement("p");
    element.className = "forecast-message";
    element.textContent = message;

    container.appendChild(element);
}

function bindHourlyRangeControls() {
    document.querySelectorAll(HOURLY_RANGE_SELECTOR).forEach((button) => {
        if (button.dataset.hourlyRangeBound === "true") {
            return;
        }

        button.dataset.hourlyRangeBound = "true";
        button.addEventListener("click", () => {
            if (button.disabled) {
                return;
            }

            const rangeIndex = Number(button.dataset.hourlyRange);

            if (!Number.isFinite(rangeIndex)) {
                return;
            }

            activeRangeIndex = rangeIndex;
            renderActiveHourlyRange(false);
        });
    });
}

function syncHourlyRangeControls(isLoading = false) {
    document.querySelectorAll(HOURLY_RANGE_SELECTOR).forEach((button) => {
        const rangeIndex = Number(button.dataset.hourlyRange);
        const range = HOURLY_RANGES.find((item) => item.index === rangeIndex);
        const isAvailable = !isLoading && Boolean(range) && currentHourly.length > range.start;
        const isActive = isAvailable && range.index === activeRangeIndex;

        button.disabled = !isAvailable;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
        button.setAttribute("aria-disabled", String(!isAvailable));
    });
}

function ensureAvailableRange() {
    const range = getActiveRange();

    if (currentHourly.length > range.start) {
        return;
    }

    const fallbackRange = HOURLY_RANGES.find((item) => currentHourly.length > item.start) ?? HOURLY_RANGES[0];
    activeRangeIndex = fallbackRange.index;
}

function getActiveRange() {
    return HOURLY_RANGES.find((range) => range.index === activeRangeIndex) ?? HOURLY_RANGES[0];
}
