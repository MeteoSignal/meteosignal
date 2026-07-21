const SECTOR_COUNT = 16;
const DEGREES_PER_SECTOR = 360 / SECTOR_COUNT;
const SECTOR_OFFSET = DEGREES_PER_SECTOR / 2;
const CALM_THRESHOLD_KMH = 0.5;

const WIND_SECTORS = Object.freeze([
    { abbreviation: "N", label: "nord" },
    { abbreviation: "NNE", label: "nord-nord-est" },
    { abbreviation: "NE", label: "nord-est" },
    { abbreviation: "ENE", label: "est-nord-est" },
    { abbreviation: "E", label: "est" },
    { abbreviation: "ESE", label: "est-sud-est" },
    { abbreviation: "SE", label: "sud-est" },
    { abbreviation: "SSE", label: "sud-sud-est" },
    { abbreviation: "S", label: "sud" },
    { abbreviation: "SSO", label: "sud-sud-ouest" },
    { abbreviation: "SO", label: "sud-ouest" },
    { abbreviation: "OSO", label: "ouest-sud-ouest" },
    { abbreviation: "O", label: "ouest" },
    { abbreviation: "ONO", label: "ouest-nord-ouest" },
    { abbreviation: "NO", label: "nord-ouest" },
    { abbreviation: "NNO", label: "nord-nord-ouest" }
]);

/**
 * Open-Meteo suit la convention météorologique : l'angle indique la provenance
 * du vent, dans le sens horaire depuis le nord. La flèche MeteoSignal montre le
 * déplacement de l'air et reçoit donc une rotation supplémentaire de 180°.
 */
export function normalizeWindAngle(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    return ((value % 360) + 360) % 360;
}

export function getWindSector(value) {
    const angle = normalizeWindAngle(value);

    if (angle === null) {
        return null;
    }

    const index = Math.floor((angle + SECTOR_OFFSET) / DEGREES_PER_SECTOR) % SECTOR_COUNT;
    return Object.freeze({ index, ...WIND_SECTORS[index] });
}

export function getWindRotation(value) {
    const angle = normalizeWindAngle(value);
    return angle === null ? null : (angle + 180) % 360;
}

export function resolveWindDirection({ direction, speed } = {}) {
    const angle = normalizeWindAngle(direction);
    const sector = getWindSector(direction);
    const validSpeed = typeof speed === "number" && Number.isFinite(speed) && speed >= 0;
    const showArrow = validSpeed && speed >= CALM_THRESHOLD_KMH && sector !== null;

    return {
        angle,
        sector,
        rotation: showArrow ? getWindRotation(direction) : null,
        showArrow,
        isCalm: validSpeed && speed < CALM_THRESHOLD_KMH,
        accessibleLabel: formatWindAccessibleLabel({ angle, sector, speed, validSpeed, showArrow })
    };
}

function formatWindAccessibleLabel({ angle, sector, speed, validSpeed, showArrow }) {
    if (!validSpeed) {
        return "Vitesse du vent indisponible.";
    }

    const speedLabel = formatFrenchNumber(speed);
    const speedUnit = speed === 1 ? "kilomètre par heure" : "kilomètres par heure";

    if (!showArrow) {
        return speed < CALM_THRESHOLD_KMH
            ? `Vent calme, à ${speedLabel} ${speedUnit}.`
            : `Vent à ${speedLabel} ${speedUnit}, direction indisponible.`;
    }

    return `Vent de secteur ${sector.label}, venant de ${formatFrenchNumber(angle)} degrés, à ${speedLabel} ${speedUnit}.`;
}

function formatFrenchNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return String(rounded).replace(".", ",");
}

export const WIND_DIRECTION_CONSTANTS = Object.freeze({
    calmThresholdKmh: CALM_THRESHOLD_KMH,
    degreesPerSector: DEGREES_PER_SECTOR,
    sectorCount: SECTOR_COUNT
});
