const WEATHER_ICON_BASE_PATH = "assets/weather-icons/conditions/";
const WEATHER_ICON_VERSION = "v1.1.6-stabilization-final-w3c";

const WEATHER_ICONS = new Map([
    ["clear-day", icon("clear-day.svg", "Ciel degage")],
    ["clear-night", icon("clear-night.svg", "Nuit degagee")],
    ["partly-cloudy-day", icon("partly-cloudy-day.svg", "Partiellement nuageux")],
    ["partly-cloudy-night", icon("partly-cloudy-night.svg", "Nuit partiellement nuageuse")],
    ["cloudy", icon("cloudy.svg", "Nuageux")],
    ["light-rain-day", icon("light-rain-day.svg", "Pluie faible")],
    ["storm-day", icon("storm-day.svg", "Orage")],
    ["fog-day", icon("fog-day.svg", "Brouillard")]
]);

export function getWeatherIcon(iconId) {
    if (!iconId) {
        return null;
    }

    return WEATHER_ICONS.get(iconId) ?? null;
}

export function createWeatherIconElement(iconId, fallback = "--", className = "weather-icon-img") {
    const iconDefinition = getWeatherIcon(iconId);

    if (!iconDefinition) {
        const fallbackElement = document.createElement("span");
        fallbackElement.className = "weather-icon-fallback";
        fallbackElement.textContent = fallback;
        return fallbackElement;
    }

    const image = document.createElement("img");
    image.className = className;
    image.src = iconDefinition.src;
    image.alt = "";
    image.decoding = "async";
    image.loading = "eager";
    image.setAttribute("aria-hidden", "true");

    return image;
}

export function renderWeatherIcon(target, iconId, fallback = "--", className = "weather-icon-img") {
    const element = typeof target === "string" ? document.querySelector(target) : target;

    if (!element) {
        return;
    }

    element.replaceChildren(createWeatherIconElement(iconId, fallback, className));
}

function icon(filename, label) {
    return {
        src: `${WEATHER_ICON_BASE_PATH}${filename}?v=${WEATHER_ICON_VERSION}`,
        label
    };
}
