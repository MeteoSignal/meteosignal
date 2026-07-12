const STORM_CODES = new Set([95, 96, 99]);

const SEVERITY_PRIORITY = {
    strong: 100,
    watch: 60,
    calm: 0
};

const ALERT_THRESHOLDS = {
    heatWatch: 32,
    heatStrong: 36,
    windWatch: 60,
    windStrong: 80,
    rainWatch: 10,
    rainStrong: 25,
    uvWatch: 6,
    uvStrong: 8,
    airWatch: 61,
    airStrong: 81
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
        badge: "Signal local",
        title: "Aucun seuil local notable détecté",
        message: "Les conditions disponibles restent sous les seuils de signal MeteoSignal pour cette zone.",
        detail: "Analyse locale indicative, basée sur les données météo disponibles.",
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

    if (!isNumber(value) || value < ALERT_THRESHOLDS.heatWatch) {
        return null;
    }

    const severity = value >= ALERT_THRESHOLDS.heatStrong ? "strong" : "watch";
    const threshold = severity === "strong" ? ALERT_THRESHOLDS.heatStrong : ALERT_THRESHOLDS.heatWatch;

    return {
        id: "heat",
        type: "heat",
        severity,
        badge: getBadge(severity),
        title: "Chaleur à surveiller",
        message: "Un seuil de chaleur est détecté localement. Pensez à limiter les efforts aux heures les plus chaudes.",
        detail: `Valeur observée/estimée : ${formatMeasured(value)} °C • seuil MeteoSignal : ${threshold} °C`,
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

    if (!isNumber(value) || value < ALERT_THRESHOLDS.windWatch) {
        return null;
    }

    const severity = value >= ALERT_THRESHOLDS.windStrong ? "strong" : "watch";
    const threshold = severity === "strong" ? ALERT_THRESHOLDS.windStrong : ALERT_THRESHOLDS.windWatch;

    return {
        id: "wind",
        type: "wind",
        severity,
        badge: getBadge(severity),
        title: "Rafales à surveiller",
        message: "Des rafales notables sont possibles localement. Vérifiez les objets exposés au vent.",
        detail: `Rafales estimées : ${formatRounded(value)} km/h • seuil MeteoSignal : ${threshold} km/h`,
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

    if (!isNumber(value) || value < ALERT_THRESHOLDS.rainWatch) {
        return null;
    }

    const severity = value >= ALERT_THRESHOLDS.rainStrong ? "strong" : "watch";
    const threshold = severity === "strong" ? ALERT_THRESHOLDS.rainStrong : ALERT_THRESHOLDS.rainWatch;
    const probability = today.precipitationProbabilityMax;
    const detailParts = [`Cumul estimé : ${formatDecimal(value)} mm`, `seuil MeteoSignal : ${threshold} mm`];

    if (isNumber(probability)) {
        detailParts.push(`risque ${formatRounded(probability)} %`);
    }

    return {
        id: "rain",
        type: "rain",
        severity,
        badge: getBadge(severity),
        title: "Pluie soutenue possible",
        message: "Un cumul de pluie notable est détecté dans les données disponibles.",
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
        ? "Signal météo détecté sur les conditions actuelles"
        : "Signal météo détecté dans les prochaines 24 h";

    return {
        id: "storm",
        type: "storm",
        severity: "strong",
        badge: getBadge("strong"),
        title: "Contexte orageux possible",
        message: "Les données météo indiquent un signal orageux local à suivre.",
        detail: `${detail} • analyse locale sur 24 h`,
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

    if (!isNumber(value) || value < ALERT_THRESHOLDS.uvWatch) {
        return null;
    }

    const severity = value >= ALERT_THRESHOLDS.uvStrong ? "strong" : "watch";
    const threshold = severity === "strong" ? ALERT_THRESHOLDS.uvStrong : ALERT_THRESHOLDS.uvWatch;

    return {
        id: "uv",
        type: "uv",
        severity,
        badge: getBadge(severity),
        title: "Indice UV à surveiller",
        message: "Le rayonnement UV peut être élevé. Une protection solaire peut être utile.",
        detail: `Indice UV max : ${formatMeasured(value)} • seuil MeteoSignal : ${threshold}`,
        priority: value
    };
}

function buildAirQualityAlert(weather) {
    const airQuality = weather.airQuality;
    const value = numberOrNull(airQuality?.europeanAqi);

    if (!isNumber(value) || value < ALERT_THRESHOLDS.airWatch) {
        return null;
    }

    const severity = value >= ALERT_THRESHOLDS.airStrong ? "strong" : "watch";
    const threshold = severity === "strong" ? ALERT_THRESHOLDS.airStrong : ALERT_THRESHOLDS.airWatch;
    const condition = airQuality?.condition?.label;

    return {
        id: "air",
        type: "air",
        severity,
        badge: getBadge(severity),
        title: "Qualité de l'air à surveiller",
        message: "La qualité de l'air locale peut être moins favorable pour les personnes sensibles.",
        detail: [condition, `AQI ${formatRounded(value)}`, `seuil MeteoSignal : ${threshold}`].filter(Boolean).join(" • "),
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
    return severity === "strong" ? "Seuil notable" : "À surveiller";
}

function formatRounded(value) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatDecimal(value) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function formatMeasured(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "--";
    }

    const truncated = Math.trunc(number * 10) / 10;
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(truncated);
}
