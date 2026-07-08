const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "config", "config.js");
const TIME_ZONE = "Europe/Paris";

const now = new Date();
const buildDate = formatBuildDate(now);
const lastUpdated = formatFrenchDate(now);

const source = fs.readFileSync(CONFIG_PATH, "utf8");
const newline = source.includes("\r\n") ? "\r\n" : "\n";

let updated = source.replace(
    /(\bbuild:\s*")[^"]+(")/,
    `$1${buildDate}$2`
);

if (/\blastUpdated:\s*"/.test(updated)) {
    updated = updated.replace(
        /(\blastUpdated:\s*")[^"]*(")/,
        `$1${lastUpdated}$2`
    );
} else {
    updated = updated.replace(
        /(    build:\s*"[^"]+",\r?\n)/,
        `$1    lastUpdated: "${lastUpdated}",${newline}`
    );
}

if (updated === source) {
    console.log("MeteoSignal build date already up to date.");
} else {
    fs.writeFileSync(CONFIG_PATH, updated, "utf8");
    console.log(`MeteoSignal build date updated: ${buildDate} / ${lastUpdated}`);
}

function formatBuildDate(date) {
    const parts = getParisDateParts(date);

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatFrenchDate(date) {
    return new Intl.DateTimeFormat("fr-FR", {
        timeZone: TIME_ZONE,
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(date);
}

function getParisDateParts(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    return {
        year: getPart(parts, "year"),
        month: getPart(parts, "month"),
        day: getPart(parts, "day")
    };
}

function getPart(parts, type) {
    const part = parts.find((item) => item.type === type);

    if (!part) {
        throw new Error(`Unable to format ${type} for MeteoSignal build date.`);
    }

    return part.value;
}
