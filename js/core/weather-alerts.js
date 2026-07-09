const STORM_CODES = new Set([95, 96, 99]);

const SEVERITY_PRIORITY = {
    strong: 100,
    watch: 60,
    calm: 0
};

export function analyzeWeatherAlerts(weather = {}) {
    const alerts = [
        buildHeatAlert(weather),
        buildWindAlert(weather),
        buildRainAlert(weather),
        buildStormAlert(weather),
        buildUvAlert(weather),
        buildAirQualityAlert(weather)
    ].filter(Boolean);

    return alerts.sort((left, right) => {
        const severityDelta = getSeverityPriority(right.severity) - getSeverityPriority(left.severity);

        if (severityDelta !== 0) {
            return severityDelta;
        }

        return right.priority - left.priority;
    });
}

export function createCalmWeatherAlert() {
    return {
        id: "calm",
        type: "calm",
        severity: "calm",
        badge: "Situation calme",
        title: "Aucun seuil local notable détecté",
        message: "Les données disponibles ne signalent pas de seuil météo particulier pour cette zone.",
        detail: "Signal météo local MeteoSignal",
        priority: 0
    };
}

function buildHeatAlert(weather) {
    const current = weather.current ?? {};
    const today = weather.daily?.[0] ?? {};
    const value = maxNumber([
        current.temperature,
        current.apparentTemperature,
        today.temperatureMax,
        today.apparentTemperatureMax
    ]);

    if (!isNumber(value) || value < 32) {
        return null;
    }

    const severity = value >= 36 ? "strong" : "watch";

    return {
        id: "heat",
        type: "heat",
        severity,
        badge: getBadge(severity),
        title: "Chaleur élevée",
        message: severity === "strong"
            ? "Alerte locale estimée : chaleur marquée sur la zone."
            : "À surveiller : température élevée détectée localement.",
        detail: `Seuil chaleur atteint : ${formatRounded(value)} °C`,
        priority: value
    };
}

function buildWindAlert(weather) {
    const current = weather.current ?? {};
    const today = weather.daily?.[0] ?? {};
    const value = maxNumber([
        current.wind?.gusts,
        today.windGustsMax
    ]);

    if (!isNumber(value) || value < 60) {
        return null;
    }

    const severity = value >= 80 ? "strong" : "watch";

    return {
        id: "wind",
        type: "wind",
        severity,
        badge: getBadge(severity),
        title: "Vent fort",
        message: severity === "strong"
            ? "Alerte locale estimée : rafales fortes possibles."
            : "À surveiller : rafales notables détectées.",
        detail: `Rafales jusqu'à ${formatRounded(value)} km/h`,
        priority: value
    };
}

function buildRainAlert(weather) {
    const today = weather.daily?.[0] ?? {};
    const nextHours = getNextHours(weather.hourly, 24);
    const hourlyTotal = sumNumbers(nextHours.map((hour) => hour.precipitation));
    const value = maxNumber([
        today.precipitationSum,
        hourlyTotal
    ]);

    if (!isNumber(value) || value < 10) {
        return null;
    }

    const severity = value >= 25 ? "strong" : "watch";
    const probability = today.precipitationProbabilityMax;
    const detailParts = [`Cumul estimé : ${formatDecimal(value)} mm`];

    if (isNumber(probability)) {
        detailParts.push(`risque ${formatRounded(probability)} %`);
    }

    return {
        id: "rain",
        type: "rain",
        severity,
        badge: getBadge(severity),
        title: "Pluie importante",
        message: severity === "strong"
            ? "Alerte locale estimée : cumul de pluie significatif."
            : "À surveiller : pluie notable possible.",
        detail: detailParts.join(" • "),
        priority: value
    };
}

function buildStormAlert(weather) {
    const current = weather.current ?? {};
    const nextHours = getNextHours(weather.hourly, 24);
    const currentCode = numberOrNull(current.weatherCode);
    const stormHour = nextHours.find((hour) => STORM_CODES.has(numberOrNull(hour.weatherCode)));
    const hasCurrentStorm = STORM_CODES.has(currentCode);

    if (!hasCurrentStorm && !stormHour) {
        return null;
    }

    const detail = hasCurrentStorm
        ? "Signal détecté sur les conditions actuelles"
        : "Signal détecté dans les prochaines 24 h";

    return {
        id: "storm",
        type: "storm",
        severity: "strong",
        badge: getBadge("strong"),
        title: "Orage potentiel",
        message: "Alerte locale estimée : contexte orageux détecté par les données météo.",
        detail,
        priority: 120
    };
}

function buildUvAlert(weather) {
    const today = weather.daily?.[0] ?? {};
    const nextHours = getNextHours(weather.hourly, 24);
    const value = maxNumber([
        today.uvIndexMax,
        maxNumber(nextHours.map((hour) => hour.uvIndex))
    ]);

    if (!isNumber(value) || value < 6) {
        return null;
    }

    const severity = value >= 8 ? "strong" : "watch";

    return {
        id: "uv",
        type: "uv",
        severity,
        badge: getBadge(severity),
        title: "Indice UV élevé",
        message: severity === "strong"
            ? "Alerte locale estimée : rayonnement UV très élevé."
            : "À surveiller : rayonnement UV élevé attendu.",
        detail: `Indice UV max : ${formatRounded(value)}`,
        priority: value
    };
}

function buildAirQualityAlert(weather) {
    const airQuality = weather.airQuality;
    const value = numberOrNull(airQuality?.europeanAqi);

    if (!isNumber(value) || value < 61) {
        return null;
    }

    const severity = value >= 81 ? "strong" : "watch";
    const condition = airQuality?.condition?.label;

    return {
        id: "air",
        type: "air",
        severity,
        badge: getBadge(severity),
        title: "Qualité de l'air dégradée",
        message: severity === "strong"
            ? "Alerte locale estimée : qualité de l'air mauvaise."
            : "À surveiller : qualité de l'air dégradée.",
        detail: [condition, `AQI ${formatRounded(value)}`].filter(Boolean).join(" • "),
        priority: value
    };
}

function getNextHours(hourly = [], limit = 24) {
    return Array.isArray(hourly) ? hourly.slice(0, limit) : [];
}

function maxNumber(values) {
    const numbers = values.map(numberOrNull).filter(isNumber);
    return numbers.length > 0 ? Math.max(...numbers) : null;
}

function sumNumbers(values) {
    const numbers = values.map(numberOrNull).filter(isNumber);
    return numbers.length > 0
        ? numbers.reduce((total, value) => total + value, 0)
        : null;
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function isNumber(value) {
    return Number.isFinite(Number(value));
}

function getSeverityPriority(severity) {
    return SEVERITY_PRIORITY[severity] ?? 0;
}

function getBadge(severity) {
    return severity === "strong" ? "Alerte locale estimée" : "À surveiller";
}

function formatRounded(value) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}
