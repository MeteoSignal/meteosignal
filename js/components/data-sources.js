import { formatTime } from "../core/formatters.js?v=1.5.1-release";
import { weatherProviderRegistry } from "../services/weather-provider.js?v=1.5.1-release";

const SOURCE_TARGETS = {
    current: "[data-source-current]",
    hourly: "[data-source-hourly]",
    daily: "[data-source-daily]"
};

export function renderDataSources(weather = {}) {
    Object.entries(SOURCE_TARGETS).forEach(([block, selector]) => {
        setSourceText(selector, formatSource(weather.sources?.[block]));
    });

    renderAirQualitySource(weather.sources?.airQuality);
}

export function renderDataSourcesEmpty() {
    Object.values(SOURCE_TARGETS).forEach((selector) => setSourceText(selector, ""));
    document.querySelectorAll(".metric-source-inline").forEach((element) => element.remove());
}

export function formatSource(source) {
    if (!source?.providerId) {
        return "";
    }

    const providerName = getProviderName(source.providerId);
    const prefix = source.isFallback ? "Source de secours" : "Source";
    const sourceTime = source.observedAt ?? source.issuedAt;
    const timeSuffix = sourceTime ? ` · ${formatTime(sourceTime)}` : "";

    return `${prefix} : ${providerName}${timeSuffix}`;
}

function renderAirQualitySource(source) {
    document.querySelectorAll(".metric-source-inline").forEach((element) => element.remove());

    if (!source?.providerId) {
        return;
    }

    const detail = document.querySelector('[data-card-tone="air"] small');

    if (!detail) {
        return;
    }

    const sourceLabel = document.createElement("span");
    sourceLabel.className = "metric-source-inline";
    sourceLabel.textContent = ` · ${getProviderName(source.providerId)}`;
    detail.appendChild(sourceLabel);
}

function getProviderName(providerId) {
    return weatherProviderRegistry.get(providerId)?.name ?? providerId;
}

function setSourceText(selector, text) {
    const element = document.querySelector(selector);

    if (!element) {
        return;
    }

    element.textContent = text;
    element.hidden = !text;
}
