import { analyzeWeatherAlerts, createCalmWeatherAlert } from "../core/weather-alerts.js?v=1.5.5-release";

const ALERTS_PANEL_SELECTOR = "[data-alerts]";
const ALERTS_LIST_SELECTOR = "[data-alerts-list]";
const MAX_VISIBLE_ALERTS = 4;

export function renderWeatherAlertsLoading() {
    renderAlerts([{
        id: "loading",
        type: "loading",
        severity: "calm",
        badge: "Signal local",
        title: "Analyse des signaux météo locaux",
        message: "MeteoSignal vérifie les seuils météo utiles pour cette zone.",
        detail: "Analyse locale indicative en cours."
    }], {
        state: "loading",
        isBusy: true
    });
}

export function renderWeatherAlerts(weather) {
    const alerts = analyzeWeatherAlerts(weather);
    const visibleAlerts = alerts.length > 0
        ? alerts.slice(0, MAX_VISIBLE_ALERTS)
        : [createCalmWeatherAlert()];

    renderAlerts(visibleAlerts, {
        state: alerts.length > 0 ? "active" : "calm",
        isBusy: false,
        total: alerts.length
    });
}

export function renderWeatherAlertsError() {
    renderAlerts([{
        id: "unavailable",
        type: "unavailable",
        severity: "calm",
        badge: "Signal local",
        title: "Analyse des signaux indisponible",
        message: "Le signal météo local ne peut pas être calculé pour le moment.",
        detail: "Les prévisions principales restent affichées si elles sont disponibles."
    }], {
        state: "error",
        isBusy: false
    });
}

function renderAlerts(alerts, options = {}) {
    const panel = document.querySelector(ALERTS_PANEL_SELECTOR);
    const container = document.querySelector(ALERTS_LIST_SELECTOR);

    if (!panel || !container) {
        return;
    }

    const total = Number.isFinite(Number(options.total)) ? Number(options.total) : alerts.length;

    panel.dataset.alertsState = options.state ?? "calm";
    panel.dataset.alertsCount = String(total);
    panel.setAttribute("aria-busy", String(Boolean(options.isBusy)));
    container.innerHTML = "";
    container.setAttribute("aria-busy", String(Boolean(options.isBusy)));

    alerts.forEach((alert) => {
        container.appendChild(buildAlertCard(alert));
    });

    if (total > alerts.length) {
        container.appendChild(buildHiddenCount(total - alerts.length));
    }
}

function buildAlertCard(alert) {
    const card = document.createElement("div");
    card.className = "alert-card";
    card.dataset.alertType = alert.type;
    card.dataset.alertSeverity = alert.severity;
    card.setAttribute("role", "listitem");

    const badge = document.createElement("span");
    badge.className = "alert-badge";
    badge.textContent = alert.badge;

    const title = document.createElement("h3");
    title.textContent = alert.title;

    const message = document.createElement("p");
    message.textContent = alert.message;

    const detail = document.createElement("small");
    detail.className = "alert-detail";
    detail.textContent = alert.detail;

    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(detail);

    return card;
}

function buildHiddenCount(count) {
    const note = document.createElement("p");
    note.className = "alerts-note";
    note.textContent = `${count} autre${count > 1 ? "s" : ""} signal${count > 1 ? "s" : ""} local${count > 1 ? "aux" : ""} également détecté${count > 1 ? "s" : ""}.`;
    return note;
}
