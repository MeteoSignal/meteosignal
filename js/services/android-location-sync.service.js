export const ANDROID_LOCATION_SYNC_REVISION = "1";
export const ANDROID_LOCATION_INTENT_MAX_LENGTH = 1800;
const LOG_PREFIX = "[MeteoSignal Android Sync]";

globalThis.console?.debug?.(`${LOG_PREFIX} initialisation du service`);

const INTENT_PREFIX = "intent://location/sync";
const INTENT_SUFFIX = [
    "#Intent",
    "scheme=meteosignal",
    "package=fr.meteosignal.app",
    "action=fr.meteosignal.app.action.SYNC_LOCATION",
    "category=android.intent.category.BROWSABLE",
    "end"
].join(";");

const TEXT_LIMITS = Object.freeze({
    name: 120,
    label: 240,
    country: 100,
    countryCode: 2,
    timezone: 80
});

export function createAndroidLocationSyncIntent(location) {
    const normalized = normalizeSyncLocation(location);

    if (!normalized) {
        return null;
    }

    const parameters = new URLSearchParams();
    parameters.set("revision", ANDROID_LOCATION_SYNC_REVISION);
    parameters.set("name", normalized.name);
    parameters.set("latitude", String(normalized.latitude));
    parameters.set("longitude", String(normalized.longitude));

    for (const field of ["label", "country", "countryCode", "timezone"]) {
        if (normalized[field]) {
            parameters.set(field, normalized[field]);
        }
    }

    const intent = `${INTENT_PREFIX}?${parameters.toString()}${INTENT_SUFFIX}`;
    return intent.length <= ANDROID_LOCATION_INTENT_MAX_LENGTH ? intent : null;
}

export function syncActiveLocationWithAndroid(location, options = {}) {
    globalThis.console?.debug?.(`${LOG_PREFIX} ville reçue`, location?.name ?? "invalide");
    const intent = createAndroidLocationSyncIntent(location);
    const documentRef = options.documentRef ?? globalThis.document;

    if (!intent) {
        globalThis.console?.warn?.(`${LOG_PREFIX} URI non générée : localisation invalide`);
        return false;
    }

    globalThis.console?.debug?.(`${LOG_PREFIX} URI générée`, intent);

    if (!documentRef?.body || typeof documentRef.createElement !== "function") {
        globalThis.console?.warn?.(`${LOG_PREFIX} ouverture impossible : document indisponible`);
        return false;
    }

    let anchor;

    try {
        globalThis.console?.debug?.(`${LOG_PREFIX} tentative d'ouverture`);
        anchor = documentRef.createElement("a");
        anchor.href = intent;
        anchor.hidden = true;
        anchor.tabIndex = -1;
        anchor.setAttribute("aria-hidden", "true");
        documentRef.body.appendChild(anchor);
        anchor.click();
        globalThis.console?.debug?.(`${LOG_PREFIX} ouverture demandée`);
        return true;
    } catch (error) {
        globalThis.console?.error?.(`${LOG_PREFIX} erreur d'ouverture`, error);
        return false;
    } finally {
        anchor?.remove?.();
    }
}

function normalizeSyncLocation(location) {
    if (!isRecord(location)) {
        return null;
    }

    const name = normalizeRequiredText(location.name, TEXT_LIMITS.name);
    const latitude = normalizeCoordinate(location.latitude, -90, 90);
    const longitude = normalizeCoordinate(location.longitude, -180, 180);

    if (!name || latitude === null || longitude === null) {
        return null;
    }

    return {
        name,
        latitude,
        longitude,
        label: normalizeOptionalText(location.label, TEXT_LIMITS.label),
        country: normalizeOptionalText(location.country, TEXT_LIMITS.country),
        countryCode: normalizeCountryCode(location.countryCode),
        timezone: normalizeOptionalText(location.timezone, TEXT_LIMITS.timezone)
    };
}

function normalizeCoordinate(value, minimum, maximum) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
        return null;
    }

    return Object.is(value, -0) ? 0 : value;
}

function normalizeRequiredText(value, maximumLength) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();
    return normalized && Array.from(normalized).length <= maximumLength ? normalized : null;
}

function normalizeOptionalText(value, maximumLength) {
    return normalizeRequiredText(value, maximumLength);
}

function normalizeCountryCode(value) {
    const countryCode = normalizeOptionalText(value, TEXT_LIMITS.countryCode);
    return countryCode && /^[A-Za-z]{2}$/.test(countryCode) ? countryCode.toUpperCase() : null;
}

function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
