const INACTIVE_POPULATED_CODES = new Set(["PPLH", "PPLQ", "PPLW"]);
const SEMANTIC_DUPLICATE_DISTANCE_KM = 1;
const COUNTRY_ALIAS_OVERRIDES = new Map([
    ["france", "FR"],
    ["etats unis", "US"],
    ["usa", "US"],
    ["royaume uni", "GB"],
    ["grande bretagne", "GB"],
    ["coree du sud", "KR"],
    ["coree du nord", "KP"],
    ["republique tcheque", "CZ"],
    ["tchequie", "CZ"]
]);

let countryAliases = null;

export function normalizeSearchText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/œ/gi, "oe")
        .replace(/æ/gi, "ae")
        .replace(/ß/gi, "ss")
        .toLocaleLowerCase("fr")
        .replace(/[’'`´-]+/g, " ")
        .replace(/[^a-z0-9\p{L}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function createLocationSearchPlan(query) {
    const originalQuery = String(query ?? "").trim().replace(/\s+/g, " ");
    const parsedQuery = parseLocationQuery(originalQuery);
    const supplementalName = createSeparatorVariant(parsedQuery.place);

    return Object.freeze({
        originalQuery,
        place: parsedQuery.place,
        placeNormalized: normalizeSearchText(parsedQuery.place),
        qualifier: parsedQuery.qualifier,
        primary: Object.freeze({
            name: parsedQuery.place,
            countryCode: parsedQuery.qualifier?.countryCode ?? null
        }),
        supplemental: supplementalName
            ? Object.freeze({
                name: supplementalName,
                countryCode: parsedQuery.qualifier?.countryCode ?? null
            })
            : null
    });
}

export function shouldRequestSupplemental(plan, primaryResults) {
    if (!plan?.supplemental || !Array.isArray(primaryResults)) {
        return false;
    }

    return !primaryResults.some((location) => (
        isExactLocationMatch(location, plan)
        && matchesLocationQualifier(location, plan.qualifier)
    ));
}

export function rankLocationResults(results, plan) {
    const uniqueResults = deduplicateLocations(results, plan);

    return uniqueResults
        .map((location, providerIndex) => ({ location, providerIndex }))
        .sort((left, right) => compareRankedLocations(left, right, plan))
        .map(({ location }) => location);
}

export function findUniqueExactInhabitedLocation(results, plan) {
    if (!Array.isArray(results) || !plan) {
        return null;
    }

    const matches = results.filter((location) => (
        isExactLocationMatch(location, plan)
        && matchesLocationQualifier(location, plan.qualifier)
        && isInhabitedLocation(location)
    ));

    return matches.length === 1 ? matches[0] : null;
}

export function getAutomaticLocationSelection(results, plan, intent = "input") {
    return intent === "submit"
        ? findUniqueExactInhabitedLocation(results, plan)
        : null;
}

export function getNextSuggestionIndex(currentIndex, key, itemCount) {
    if (!Number.isInteger(itemCount) || itemCount <= 0) {
        return -1;
    }

    if (key === "Home") {
        return 0;
    }

    if (key === "End") {
        return itemCount - 1;
    }

    if (key === "ArrowDown") {
        return currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
    }

    if (key === "ArrowUp") {
        return currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
    }

    return currentIndex;
}

export function createSearchRequestGuard() {
    let currentRequestId = 0;

    return Object.freeze({
        next() {
            currentRequestId += 1;
            return currentRequestId;
        },
        invalidate() {
            currentRequestId += 1;
        },
        isCurrent(requestId) {
            return requestId === currentRequestId;
        }
    });
}

export function isInhabitedLocation(location) {
    const featureCode = String(location?.featureCode ?? "").toUpperCase();

    return featureCode.startsWith("PPL") && !INACTIVE_POPULATED_CODES.has(featureCode);
}

export function getLocationTypeLabel(location) {
    const featureCode = String(location?.featureCode ?? "").toUpperCase();

    if (featureCode === "PPLC") {
        return "Capitale";
    }

    if (/^PPLA\d?$/.test(featureCode)) {
        return "Centre administratif";
    }

    if (isInhabitedLocation(location)) {
        return "Ville ou commune";
    }

    if (featureCode === "AIRP") {
        return "Aéroport";
    }

    if (featureCode === "PRK") {
        return "Parc ou site";
    }

    if (featureCode === "MNMT") {
        return "Monument";
    }

    return "Lieu";
}

function parseLocationQuery(query) {
    const commaIndex = query.indexOf(",");

    if (commaIndex > 0) {
        const place = query.slice(0, commaIndex).trim();
        const rawQualifier = query.slice(commaIndex + 1).trim();
        return {
            place: place || query,
            qualifier: rawQualifier ? createQualifier(rawQualifier, true) : null
        };
    }

    const tokens = query.split(/\s+/).filter(Boolean);

    for (let length = Math.min(3, tokens.length - 1); length >= 1; length -= 1) {
        const rawQualifier = tokens.slice(-length).join(" ");
        const countryCode = resolveCountryCode(rawQualifier);

        if (countryCode) {
            return {
                place: tokens.slice(0, -length).join(" "),
                qualifier: createQualifier(rawQualifier, false, countryCode)
            };
        }
    }

    return { place: query, qualifier: null };
}

function createQualifier(rawQualifier, explicitSeparator, resolvedCountryCode = null) {
    const countryCode = resolvedCountryCode ?? resolveCountryCode(rawQualifier);

    return Object.freeze({
        raw: rawQualifier,
        normalized: normalizeSearchText(rawQualifier),
        type: countryCode ? "country" : "region",
        countryCode,
        explicitSeparator
    });
}

function resolveCountryCode(value) {
    const normalizedValue = normalizeSearchText(value);

    if (!normalizedValue) {
        return null;
    }

    if (/^[a-z]{2}$/.test(normalizedValue)) {
        return normalizedValue.toUpperCase();
    }

    return getCountryAliases().get(normalizedValue) ?? null;
}

function getCountryAliases() {
    if (countryAliases) {
        return countryAliases;
    }

    const aliases = new Map(COUNTRY_ALIAS_OVERRIDES);
    const displayNames = ["fr", "en"].map((locale) => {
        try {
            return new Intl.DisplayNames([locale], { type: "region" });
        } catch (error) {
            return null;
        }
    }).filter(Boolean);

    for (let first = 65; first <= 90; first += 1) {
        for (let second = 65; second <= 90; second += 1) {
            const countryCode = String.fromCharCode(first, second);

            displayNames.forEach((formatter) => {
                const countryName = formatter.of(countryCode);
                const normalizedName = normalizeSearchText(countryName);

                if (
                    normalizedName
                    && normalizedName !== countryCode.toLowerCase()
                    && !aliases.has(normalizedName)
                ) {
                    aliases.set(normalizedName, countryCode);
                }
            });
        }
    }

    countryAliases = aliases;
    return countryAliases;
}

function createSeparatorVariant(place) {
    const normalizedPlace = String(place ?? "").trim().replace(/\s+/g, " ");

    if (!normalizedPlace || !/^[\p{L}’' -]+$/u.test(normalizedPlace)) {
        return null;
    }

    if (normalizedPlace.includes("-")) {
        const spacedVariant = normalizedPlace.replace(/-+/g, " ").replace(/\s+/g, " ");
        return spacedVariant !== normalizedPlace ? spacedVariant : null;
    }

    const words = normalizedPlace.split(" ");
    return words.length >= 2 && words.length <= 6 ? words.join("-") : null;
}

function compareRankedLocations(left, right, plan) {
    const leftRank = getLocationRank(left.location, left.providerIndex, plan);
    const rightRank = getLocationRank(right.location, right.providerIndex, plan);

    for (let index = 0; index < leftRank.length; index += 1) {
        if (leftRank[index] !== rightRank[index]) {
            return rightRank[index] - leftRank[index];
        }
    }

    return 0;
}

function getLocationRank(location, providerIndex, plan) {
    return [
        isExactLocationMatch(location, plan) ? 1 : 0,
        matchesLocationQualifier(location, plan.qualifier) ? 1 : 0,
        getFeaturePriority(location),
        normalizePopulation(location.population),
        -providerIndex
    ];
}

function isExactLocationMatch(location, plan) {
    const placeNormalized = plan?.placeNormalized ?? "";

    if (!placeNormalized) {
        return false;
    }

    if (normalizeSearchText(location?.name) === placeNormalized) {
        return true;
    }

    return Array.isArray(location?.postcodes)
        && location.postcodes.some((postcode) => normalizeSearchText(postcode) === placeNormalized);
}

function matchesLocationQualifier(location, qualifier) {
    if (!qualifier) {
        return true;
    }

    if (qualifier.type === "country") {
        return String(location?.countryCode ?? "").toUpperCase() === qualifier.countryCode;
    }

    const normalizedAdmin = normalizeSearchText(location?.admin1);
    const normalizedCountry = normalizeSearchText(location?.country);
    return normalizedAdmin === qualifier.normalized || normalizedCountry === qualifier.normalized;
}

function getFeaturePriority(location) {
    const featureCode = String(location?.featureCode ?? "").toUpperCase();

    if (featureCode === "PPLC") {
        return 4;
    }

    if (/^PPLA\d?$/.test(featureCode)) {
        return 3;
    }

    if (isInhabitedLocation(location)) {
        return 2;
    }

    if (featureCode.startsWith("ADM")) {
        return 1;
    }

    return 0;
}

function normalizePopulation(value) {
    const population = Number(value);
    return Number.isFinite(population) && population > 0 ? population : 0;
}

function deduplicateLocations(results, plan) {
    const uniqueLocations = [];

    (Array.isArray(results) ? results : []).forEach((location, providerIndex) => {
        const candidate = { location, providerIndex };
        const duplicateIndex = uniqueLocations.findIndex((existing) => (
            hasSameProviderId(existing.location, location)
            || areSemanticallyEquivalent(existing.location, location)
        ));

        if (duplicateIndex === -1) {
            uniqueLocations.push(candidate);
            return;
        }

        if (isPreferredDuplicate(candidate, uniqueLocations[duplicateIndex], plan)) {
            uniqueLocations[duplicateIndex] = candidate;
        }
    });

    return uniqueLocations.map(({ location }) => location);
}

function hasSameProviderId(left, right) {
    return left?.id !== null
        && left?.id !== undefined
        && right?.id !== null
        && right?.id !== undefined
        && String(left.id) === String(right.id);
}

function areSemanticallyEquivalent(left, right) {
    if (
        normalizeSearchText(left?.name) !== normalizeSearchText(right?.name)
        || getCountryKey(left) !== getCountryKey(right)
        || normalizeSearchText(left?.admin1) !== normalizeSearchText(right?.admin1)
        || String(left?.featureCode ?? "").toUpperCase() !== String(right?.featureCode ?? "").toUpperCase()
    ) {
        return false;
    }

    const distanceKm = getCoordinateDistanceKm(left, right);
    return distanceKm !== null && distanceKm <= SEMANTIC_DUPLICATE_DISTANCE_KM;
}

function getCountryKey(location) {
    const countryCode = String(location?.countryCode ?? "").trim().toUpperCase();
    return countryCode || normalizeSearchText(location?.country);
}

function getCoordinateDistanceKm(left, right) {
    const coordinateValues = [
        left?.latitude,
        left?.longitude,
        right?.latitude,
        right?.longitude
    ];

    if (coordinateValues.some((value) => value === null || value === undefined || value === "")) {
        return null;
    }

    const [leftLatitude, leftLongitude, rightLatitude, rightLongitude] = coordinateValues.map(Number);

    if (![leftLatitude, leftLongitude, rightLatitude, rightLongitude].every(Number.isFinite)) {
        return null;
    }

    const toRadians = (value) => value * (Math.PI / 180);
    const latitudeDelta = toRadians(rightLatitude - leftLatitude);
    const longitudeDelta = toRadians(rightLongitude - leftLongitude);
    const startLatitude = toRadians(leftLatitude);
    const endLatitude = toRadians(rightLatitude);
    const haversine = (
        Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(startLatitude)
            * Math.cos(endLatitude)
            * Math.sin(longitudeDelta / 2) ** 2
    );

    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function isPreferredDuplicate(candidate, existing, plan) {
    const candidateRank = getLocationRank(candidate.location, candidate.providerIndex, plan).slice(0, -1);
    const existingRank = getLocationRank(existing.location, existing.providerIndex, plan).slice(0, -1);

    for (let index = 0; index < candidateRank.length; index += 1) {
        if (candidateRank[index] !== existingRank[index]) {
            return candidateRank[index] > existingRank[index];
        }
    }

    const candidateCompleteness = getLocationCompleteness(candidate.location);
    const existingCompleteness = getLocationCompleteness(existing.location);

    if (candidateCompleteness !== existingCompleteness) {
        return candidateCompleteness > existingCompleteness;
    }

    return candidate.providerIndex < existing.providerIndex;
}

function getLocationCompleteness(location) {
    const populatedFields = [
        location?.id,
        location?.name,
        location?.country,
        location?.countryCode,
        location?.admin1,
        location?.timezone,
        location?.featureCode
    ].filter((value) => value !== null && value !== undefined && value !== "").length;
    const hasCoordinates = location?.latitude !== null
        && location?.latitude !== undefined
        && location?.longitude !== null
        && location?.longitude !== undefined
        && Number.isFinite(Number(location.latitude))
        && Number.isFinite(Number(location.longitude));
    const hasPostcodes = Array.isArray(location?.postcodes) && location.postcodes.length > 0;
    const hasPopulation = location?.population !== null
        && location?.population !== undefined
        && Number.isFinite(Number(location.population));

    return populatedFields + (hasCoordinates ? 2 : 0) + (hasPostcodes ? 1 : 0) + (hasPopulation ? 1 : 0);
}
