import {
    formatAirQualityValue,
    formatPercent,
    formatPrecipitation,
    formatPressure,
    formatSpeed
} from "../core/formatters.js?v=1.5.1-release";

const WEATHER_CARDS_SELECTOR = "[data-weather-cards]";

export function renderWeatherCardsLoading() {
    setWeatherCardsBusy(true);
    renderCards([
        createCard("Vent", "--", "Vitesse moyenne", "wind"),
        createCard("Humidité", "--", "Taux actuel", "humidity"),
        createCard("Pression", "-- hPa", "Atmosphère", "pressure"),
        createCard("Précipitations", "-- mm", "Cumul récent", "rain"),
        createCard("Indice UV", "--", "Rayonnement", "uv"),
        createCard("Qualité de l'air", "--", "Indice européen", "air")
    ]);
}

export function renderWeatherCards(weather) {
    const current = weather.current;
    const today = weather.daily[0] ?? {};
    const airQuality = weather.airQuality;

    setWeatherCardsBusy(false);
    renderCards([
        createCard(
            "Vent",
            formatSpeed(current.wind.speed),
            formatWindDetails(current.wind),
            "wind"
        ),
        createCard(
            "Humidité",
            formatPercent(current.humidity),
            getHumidityLabel(current.humidity),
            "humidity"
        ),
        createCard(
            "Pression",
            formatPressure(current.pressure),
            getPressureLabel(current.pressure),
            "pressure"
        ),
        createCard(
            "Précipitations",
            formatPrecipitation(current.precipitation),
            formatRainDetails(today.precipitationSum, today.precipitationProbabilityMax),
            "rain"
        ),
        createCard(
            "Indice UV",
            formatAirQualityValue(today.uvIndexMax),
            getUvLabel(today.uvIndexMax),
            "uv"
        ),
        createCard(
            "Qualité de l'air",
            formatAirQualityValue(airQuality?.europeanAqi),
            formatAirQualityDetails(airQuality),
            "air",
            airQuality?.condition?.tone ?? "unknown"
        )
    ]);
}

export function renderWeatherCardsError() {
    setWeatherCardsBusy(false);
    renderCards([
        createCard("Vent", "--", "Indisponible", "wind"),
        createCard("Humidité", "--", "Indisponible", "humidity"),
        createCard("Pression", "-- hPa", "Indisponible", "pressure"),
        createCard("Précipitations", "-- mm", "Indisponible", "rain"),
        createCard("Indice UV", "--", "Indisponible", "uv"),
        createCard("Qualité de l'air", "--", "Indisponible", "air", "unknown")
    ]);
}

function setWeatherCardsBusy(isBusy) {
    const container = document.querySelector(WEATHER_CARDS_SELECTOR);

    if (container) {
        container.setAttribute("aria-busy", String(isBusy));
    }
}

function renderCards(cards) {
    const container = document.querySelector(WEATHER_CARDS_SELECTOR);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    cards.forEach((card) => {
        container.appendChild(buildCardElement(card));
    });
}

function buildCardElement(card) {
    const element = document.createElement("div");
    element.className = "metric-card";
    element.dataset.cardTone = card.tone;

    if (card.state) {
        element.dataset.cardState = card.state;
    }

    const label = document.createElement("span");
    label.className = "metric-label";
    label.textContent = card.label;

    const value = document.createElement("strong");
    value.textContent = card.value;

    const detail = document.createElement("small");
    detail.textContent = card.detail;

    element.appendChild(label);
    element.appendChild(value);
    element.appendChild(detail);
    return element;
}

function createCard(label, value, detail, tone, state = null) {
    return {
        label,
        value,
        detail,
        tone,
        state
    };
}

function formatWindDetails(wind) {
    const parts = [
        wind.gusts ? `Rafales ${formatSpeed(wind.gusts)}` : null,
        formatWindDirection(wind.direction)
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" • ") : "Vent calme";
}

function formatWindDirection(direction) {
    if (!Number.isFinite(Number(direction))) {
        return null;
    }

    const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
    const index = Math.round(Number(direction) / 45) % directions.length;
    return directions[index];
}

function getHumidityLabel(value) {
    const humidity = Number(value);

    if (!Number.isFinite(humidity)) {
        return "Taux indisponible";
    }

    if (humidity < 35) {
        return "Air sec";
    }

    if (humidity > 75) {
        return "Air humide";
    }

    return "Confort ambiant";
}

function getPressureLabel(value) {
    const pressure = Number(value);

    if (!Number.isFinite(pressure)) {
        return "Mesure indisponible";
    }

    if (pressure < 1000) {
        return "Pression basse";
    }

    if (pressure > 1025) {
        return "Pression élevée";
    }

    return "Pression normale";
}

function formatRainDetails(precipitationSum, probability) {
    const parts = [
        Number.isFinite(Number(precipitationSum)) ? `Total ${formatPrecipitation(precipitationSum)}` : null,
        Number.isFinite(Number(probability)) ? `Risque ${formatPercent(probability)}` : null
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" • ") : "Risque faible";
}

function getUvLabel(value) {
    const uv = Number(value);

    if (!Number.isFinite(uv)) {
        return "Rayonnement indisponible";
    }

    if (uv < 3) {
        return "Faible";
    }

    if (uv < 6) {
        return "Modéré";
    }

    if (uv < 8) {
        return "Élevé";
    }

    if (uv < 11) {
        return "Très élevé";
    }

    return "Extrême";
}

function formatAirQualityDetails(airQuality) {
    if (!airQuality) {
        return "Indisponible";
    }

    const condition = airQuality.condition?.label ?? "Non disponible";
    const pm25 = Number.isFinite(Number(airQuality.pm25))
        ? `PM2.5 ${formatAirQualityValue(airQuality.pm25)}`
        : null;

    return [condition, pm25].filter(Boolean).join(" • ");
}
