import { formatDuration, formatPercent, formatTime } from "../core/formatters.js?v=1.1.4-weather-icons-phase1-final";

const ASTRONOMY_SELECTOR = "[data-astronomy]";
const DEFAULT_MOON_ICON = "☾";

export function renderAstronomyLoading() {
    setAstronomyState("loading");
    setText("#sunrise", "--:--");
    setText("#sunset", "--:--");
    setText("#daylight-duration", "--");
    setText("#moon-phase", "Calcul...");
    setText("#moon-light", "--");
    setText("#moon-age", "--");
    setText("#moon-icon", DEFAULT_MOON_ICON);
}

export function renderAstronomy(astronomy) {
    if (!astronomy) {
        renderAstronomyError();
        return;
    }

    const sun = astronomy.sun ?? astronomy;
    const moon = astronomy.moon ?? null;

    setAstronomyState("ready");
    setText("#sunrise", formatTime(sun.sunrise));
    setText("#sunset", formatTime(sun.sunset));
    setText("#daylight-duration", formatDuration(sun.daylightDuration));
    setText("#moon-phase", moon?.phaseLabel ?? "--");
    setText("#moon-light", formatPercent(moon?.illumination));
    setText("#moon-age", formatMoonAge(moon?.ageDays));
    setText("#moon-icon", moon?.icon ?? DEFAULT_MOON_ICON);
}

export function renderAstronomyError() {
    setAstronomyState("error");
    setText("#sunrise", "--:--");
    setText("#sunset", "--:--");
    setText("#daylight-duration", "--");
    setText("#moon-phase", "Indisponible");
    setText("#moon-light", "--");
    setText("#moon-age", "--");
    setText("#moon-icon", DEFAULT_MOON_ICON);
}

function setAstronomyState(state) {
    const container = document.querySelector(ASTRONOMY_SELECTOR);

    if (!container) {
        return;
    }

    container.dataset.astronomyState = state;
    container.setAttribute("aria-busy", state === "loading" ? "true" : "false");
}

function formatMoonAge(value) {
    const age = Number(value);

    if (!Number.isFinite(age)) {
        return "--";
    }

    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(age)} j`;
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}
