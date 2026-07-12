export function getCurrentPositionLocation() {
    if (!hasGeolocation()) {
        return Promise.reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(normalizeGeolocationPosition(position)),
            () => reject(new Error("La position n'a pas pu être récupérée.")),
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    });
}

export function normalizeGeolocationPosition(position) {
    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);

    return {
        id: `geo:${latitude.toFixed(4)},${longitude.toFixed(4)}`,
        name: "Position actuelle",
        label: "Position actuelle",
        country: null,
        countryCode: null,
        admin1: null,
        latitude,
        longitude,
        timezone: getBrowserTimezone(),
        source: "geolocation"
    };
}

function hasGeolocation() {
    return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

function getBrowserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "auto";
}
