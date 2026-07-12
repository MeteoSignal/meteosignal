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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--:--";
    }

    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

export function formatForecastDay(value) {
    const calendarDate = parseCalendarDate(value);

    if (!calendarDate) {
        return "--";
    }

    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
        weekday: "short",
        day: "2-digit",
        timeZone: "UTC"
    }).format(calendarDate);
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

function parseCalendarDate(value) {
    if (typeof value !== "string") {
        return null;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
        return null;
    }

    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day
        ? date
        : null;
}
