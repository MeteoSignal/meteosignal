const DEFAULT_LOCALE = "fr-FR";

export function formatTemperature(value) {
    return formatNumberWithUnit(value, "°", { maximumFractionDigits: 0 });
}

export function formatSpeed(value) {
    return formatNumberWithUnit(value, " km/h", { maximumFractionDigits: 0 });
}

export function formatPressure(value) {
    return formatNumberWithUnit(value, " hPa", { maximumFractionDigits: 0 });
}

export function formatPercent(value) {
    return formatNumberWithUnit(value, " %", { maximumFractionDigits: 0 });
}

export function formatPrecipitation(value) {
    return formatNumberWithUnit(value, " mm", { maximumFractionDigits: 1 });
}

export function formatAirQualityValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
        ? new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 0 }).format(value)
        : "--";
}

export function formatTime(value) {
    if (!value) {
        return "--:--";
    }

    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(value));
}

export function formatForecastDay(value) {
    if (!value) {
        return "--";
    }

    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        weekday: "short",
        day: "2-digit"
    }).format(new Date(value));
}

export function formatDuration(seconds) {
    const totalMinutes = Math.round(Number(seconds) / 60);

    if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
        return "--";
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
        return `${hours} h`;
    }

    return `${hours} h ${minutes.toString().padStart(2, "0")}`;
}

export function formatNumberWithUnit(value, unit, options = {}) {
    if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
        return `--${unit.trim() ? unit : ""}`;
    }

    const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, options).format(value);
    return `${formatted}${unit}`;
}
