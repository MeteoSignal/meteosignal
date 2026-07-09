import { formatTemperature, formatTime } from "../core/formatters.js?v=1.2.0-weather-alerts";
import { renderWeatherIcon } from "../core/weather-icons.js?v=1.2.0-weather-alerts";

const HERO_SELECTOR = "[data-weather-hero]";
const DEFAULT_TONE = "unknown";

export function renderCurrentWeatherLoading(location = null) {
    setHeroState("loading", DEFAULT_TONE);
    setText("#city", location?.name ?? "Chargement");
    setText("#temp", "--");
    setText("#description", "Chargement de la météo...");
    setText("#hero-status", "Chargement");
    setText("#updated-at", "Mise à jour --:--");
    renderWeatherIcon("#icon", null, "--", "weather-icon-img weather-icon-img--hero");
}

export function renderCurrentWeather(weather) {
    const current = weather.current;
    const today = weather.daily[0];
    const condition = current.condition;

    setHeroState("ready", condition.tone);
    setText("#city", weather.location.name);
    setText("#temp", formatTemperature(current.temperature));
    setText("#description", condition.label);
    renderWeatherIcon("#icon", condition.iconId, condition.icon, "weather-icon-img weather-icon-img--hero");
    setText("#feels-like", formatTemperature(current.apparentTemperature));
    setText("#temp-min", formatTemperature(today?.temperatureMin));
    setText("#temp-max", formatTemperature(today?.temperatureMax));
    setText("#hero-status", current.isDay ? "Journée" : "Nuit");
    setText("#updated-at", `Mise à jour ${formatTime(weather.updatedAt)}`);
}

export function renderCurrentWeatherError(message = "Données météo indisponibles.", location = null) {
    setHeroState("error", "unknown");
    setText("#city", location?.name ?? "Position indisponible");
    setText("#temp", "--");
    setText("#description", message);
    setText("#hero-status", "Indisponible");
    renderWeatherIcon("#icon", null, "--", "weather-icon-img weather-icon-img--hero");
}

function setHeroState(state, tone) {
    const hero = document.querySelector(HERO_SELECTOR);

    if (!hero) {
        return;
    }

    hero.dataset.weatherState = state;
    hero.dataset.weatherTone = tone || DEFAULT_TONE;
    hero.setAttribute("aria-busy", state === "loading" ? "true" : "false");
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}
