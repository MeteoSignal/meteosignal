const SYNODIC_MONTH_DAYS = 29.530588853;
const REFERENCE_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86400000;

const MOON_PHASES = [
    {
        key: "new",
        label: "Nouvelle lune",
        icon: "🌑",
        end: 1.84566
    },
    {
        key: "waxing-crescent",
        label: "Premier croissant",
        icon: "🌒",
        end: 5.53699
    },
    {
        key: "first-quarter",
        label: "Premier quartier",
        icon: "🌓",
        end: 9.22831
    },
    {
        key: "waxing-gibbous",
        label: "Gibbeuse croissante",
        icon: "🌔",
        end: 12.91963
    },
    {
        key: "full",
        label: "Pleine lune",
        icon: "🌕",
        end: 16.61096
    },
    {
        key: "waning-gibbous",
        label: "Gibbeuse décroissante",
        icon: "🌖",
        end: 20.30228
    },
    {
        key: "last-quarter",
        label: "Dernier quartier",
        icon: "🌗",
        end: 23.99361
    },
    {
        key: "waning-crescent",
        label: "Dernier croissant",
        icon: "🌘",
        end: 27.68493
    }
];

const FALLBACK_PHASE = MOON_PHASES[0];

export function getMoonPhase(dateValue = new Date()) {
    const date = normalizeDate(dateValue);
    const daysSinceReference = (date.getTime() - REFERENCE_NEW_MOON_UTC) / DAY_MS;
    const ageDays = positiveModulo(daysSinceReference, SYNODIC_MONTH_DAYS);
    const phase = findPhase(ageDays);
    const illumination = calculateIllumination(ageDays);

    return {
        phaseKey: phase.key,
        phaseLabel: phase.label,
        illumination,
        ageDays: roundToOneDecimal(ageDays),
        icon: phase.icon
    };
}

function normalizeDate(value) {
    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function positiveModulo(value, modulo) {
    return ((value % modulo) + modulo) % modulo;
}

function findPhase(ageDays) {
    return MOON_PHASES.find((phase) => ageDays < phase.end) ?? FALLBACK_PHASE;
}

function calculateIllumination(ageDays) {
    const angle = (2 * Math.PI * ageDays) / SYNODIC_MONTH_DAYS;
    const illumination = ((1 - Math.cos(angle)) / 2) * 100;

    return Math.round(illumination);
}

function roundToOneDecimal(value) {
    return Math.round(value * 10) / 10;
}
