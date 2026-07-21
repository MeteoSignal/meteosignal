import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildAirQualityUrl,
    normalizeAirQuality
} from "../js/services/air-quality.service.js";
import {
    buildForecastUrl,
    normalizeOpenMeteoForecast
} from "../js/services/openmeteo.service.js";

const forecastFixtureUrl = new URL("./fixtures/openmeteo/forecast.json", import.meta.url);
const airFixtureUrl = new URL("./fixtures/openmeteo/air-quality.json", import.meta.url);

test("Open-Meteo conserve le modele interne et ajoute sa provenance", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const snapshot = JSON.stringify(fixture);
    const weather = normalizeOpenMeteoForecast(fixture, {
        id: "toulouse-fr",
        name: "Toulouse",
        label: "Toulouse, France",
        country: "France",
        latitude: 43.6045,
        longitude: 1.444,
        timezone: "Europe/Paris"
    }, {
        fetchedAt: "2026-07-10T07:05:00Z"
    });

    assert.equal(weather.provider, "openmeteo");
    assert.equal(weather.current.temperature, 22.4);
    assert.equal(weather.hourly.length, 4);
    assert.deepEqual(weather.hourly.map(({ windDirection }) => windDirection), [280, 285, 290, 295]);
    assert.equal(weather.daily.length, 2);
    assert.equal(weather.astronomy.sun.sunrise, "2026-07-10T06:23");
    assert.equal(weather.sources.current.type, "forecast");
    assert.equal(weather.sources.hourly.providerId, "openmeteo");
    assert.equal(weather.sources.daily.fetchedAt, "2026-07-10T07:05:00.000Z");
    assert.equal(weather.sources.airQuality, null);
    assert.equal(JSON.stringify(fixture), snapshot);
});

test("la normalisation Air Quality reste independante de Forecast", async () => {
    const fixture = JSON.parse(await readFile(airFixtureUrl, "utf8"));
    const airQuality = normalizeAirQuality(fixture);

    assert.equal(airQuality.europeanAqi, 24);
    assert.equal(airQuality.pm25, 7.1);
    assert.equal(airQuality.condition.label, "Bonne");
});

test("la tranche horaire contenant l'instant courant est conservee", async (t) => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const cases = [
        { name: "heure exacte", currentTime: "2026-07-10T09:00", expected: "2026-07-10T09:00" },
        { name: "heure intermediaire", currentTime: "2026-07-10T09:15", expected: "2026-07-10T09:00" },
        { name: "fin d'heure", currentTime: "2026-07-10T09:59", expected: "2026-07-10T09:00" },
        { name: "minuit", currentTime: "2026-07-11T00:00", expected: "2026-07-11T00:00" },
        { name: "passage heure d'ete", currentTime: "2026-03-29T03:15", expected: "2026-03-29T03:00" },
        { name: "passage heure d'hiver", currentTime: "2026-10-25T02:30", expected: "2026-10-25T02:00" }
    ];

    for (const item of cases) {
        await t.test(item.name, () => {
            const forecast = createForecastForTimes(fixture, item.currentTime, createHoursAround(item.expected));
            const weather = normalizeOpenMeteoForecast(forecast, validLocation());

            assert.equal(weather.hourly[0].time, item.expected);
            assert.equal(weather.hourly[0].isCurrent, true);
        });
    }
});

test("une premiere prevision future conserve son heure reelle", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const forecast = createForecastForTimes(fixture, "2026-07-10T09:15", [
        "2026-07-10T10:00",
        "2026-07-10T11:00"
    ]);
    const weather = normalizeOpenMeteoForecast(forecast, validLocation());

    assert.equal(weather.hourly[0].time, "2026-07-10T10:00");
    assert.equal(weather.hourly[0].isCurrent, false);
});

test("les trois plages horaires conservent 72 heures exploitables", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const start = Date.parse("2026-07-10T09:00:00Z");
    const times = Array.from({ length: 72 }, (_, index) => (
        new Date(start + index * 60 * 60 * 1000).toISOString().slice(0, 16)
    ));
    const forecast = createForecastForTimes(fixture, "2026-07-10T09:15", times);
    const weather = normalizeOpenMeteoForecast(forecast, validLocation());

    assert.equal(weather.hourly.length, 72);
    assert.equal(weather.hourly[0].isCurrent, true);
    assert.equal(weather.hourly.slice(0, 24).length, 24);
    assert.equal(weather.hourly.slice(24, 48).length, 24);
    assert.equal(weather.hourly.slice(48, 72).length, 24);
});

test("Air Quality privilegie les variables current", () => {
    const airQuality = normalizeAirQuality({
        timezone: "Europe/Paris",
        current: {
            time: "2026-07-10T09:15",
            european_aqi: 18,
            pm10: 9,
            pm2_5: 4,
            ozone: 51,
            nitrogen_dioxide: 8
        },
        hourly: createAirQualityHours(["2026-07-10T09:00"], [99])
    }, {
        now: "2026-07-10T07:15:00Z",
        timezone: "Europe/Paris"
    });

    assert.equal(airQuality.time, "2026-07-10T09:15");
    assert.equal(airQuality.europeanAqi, 18);
});

test("Air Quality choisit l'heure courante du lieu dans plusieurs fuseaux", async (t) => {
    const times = [
        "2026-07-10T08:00",
        "2026-07-10T09:00",
        "2026-07-10T10:00"
    ];
    const cases = [
        { name: "Paris intermediaire", timezone: "Europe/Paris", now: "2026-07-10T07:15:00Z" },
        { name: "Paris heure exacte", timezone: "Europe/Paris", now: "2026-07-10T07:00:00Z" },
        { name: "Tokyo", timezone: "Asia/Tokyo", now: "2026-07-10T00:15:00Z" },
        { name: "New York", timezone: "America/New_York", now: "2026-07-10T13:15:00Z" }
    ];

    for (const item of cases) {
        await t.test(item.name, () => {
            const airQuality = normalizeAirQuality({
                timezone: item.timezone,
                hourly: createAirQualityHours(times, [10, 20, 30])
            }, item);

            assert.equal(airQuality.time, "2026-07-10T09:00");
            assert.equal(airQuality.europeanAqi, 20);
        });
    }
});

test("Air Quality respecte les changements d'heure et les bornes disponibles", async (t) => {
    const cases = [
        {
            name: "heure d'ete New York",
            timezone: "America/New_York",
            now: "2026-03-08T07:15:00Z",
            times: ["2026-03-08T01:00", "2026-03-08T03:00", "2026-03-08T04:00"],
            expected: "2026-03-08T03:00"
        },
        {
            name: "heure d'hiver New York",
            timezone: "America/New_York",
            now: "2026-11-01T06:30:00Z",
            times: ["2026-11-01T00:00", "2026-11-01T01:00", "2026-11-01T02:00"],
            expected: "2026-11-01T01:00"
        },
        {
            name: "avant le debut",
            timezone: "Europe/Paris",
            now: "2026-07-10T04:00:00Z",
            times: ["2026-07-10T08:00", "2026-07-10T09:00"],
            expected: "2026-07-10T08:00"
        },
        {
            name: "apres la fin",
            timezone: "Europe/Paris",
            now: "2026-07-10T12:00:00Z",
            times: ["2026-07-10T08:00", "2026-07-10T09:00"],
            expected: "2026-07-10T09:00"
        }
    ];

    for (const item of cases) {
        await t.test(item.name, () => {
            const airQuality = normalizeAirQuality({
                timezone: item.timezone,
                hourly: createAirQualityHours(item.times, item.times.map((_, index) => index + 10))
            }, item);

            assert.equal(airQuality.time, item.expected);
        });
    }
});

test("les URL Open-Meteo refusent les coordonnees invalides et Air Quality demande current", () => {
    const airUrl = buildAirQualityUrl(validLocation());
    const forecastUrl = buildForecastUrl(validLocation());

    assert.equal(airUrl.searchParams.get("current"), "european_aqi,pm10,pm2_5,ozone,nitrogen_dioxide");
    assert.ok(forecastUrl.searchParams.get("hourly").split(",").includes("wind_direction_10m"));
    assert.throws(() => buildAirQualityUrl({ latitude: 91, longitude: 1 }), /coordonnées/);
    assert.throws(() => buildForecastUrl({ latitude: 43, longitude: "1" }), /coordonnées/);
});

test("les capacites absentes restent nulles sur une reponse vide", () => {
    const weather = normalizeOpenMeteoForecast({}, validLocation(), {
        fetchedAt: "2026-07-10T07:05:00Z"
    });

    assert.equal(weather.current, null);
    assert.deepEqual(weather.hourly, []);
    assert.deepEqual(weather.daily, []);
    assert.equal(weather.astronomy, null);
    assert.equal(weather.sources.current, null);
    assert.equal(weather.sources.hourly, null);
    assert.equal(weather.sources.daily, null);
    assert.equal(normalizeAirQuality(null), null);
    assert.equal(normalizeAirQuality({}), null);
});

test("les champs essentiels, dates et nombres invalides sont rejetes sans interrompre le rendu", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const invalid = structuredClone(fixture);
    invalid.latitude = 120;
    invalid.longitude = "1.44";
    invalid.current.temperature_2m = "22.4";
    invalid.hourly.time[0] = "date-invalide";
    invalid.hourly.temperature_2m[1] = "24.2";
    invalid.daily.time[0] = "2026-02-30";
    invalid.daily.temperature_2m_max[1] = "29.4";

    const weather = normalizeOpenMeteoForecast(invalid, {
        ...validLocation(),
        latitude: 95,
        longitude: 200
    });

    assert.equal(weather.location, null);
    assert.equal(weather.current, null);
    assert.equal(weather.hourly.length, 2);
    assert.equal(weather.daily.length, 0);
    assert.equal(weather.astronomy, null);
});

test("des tableaux de longueurs differentes conservent uniquement les lignes exploitables", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const partial = structuredClone(fixture);
    partial.current.time = "2026-07-10T09:15";
    partial.hourly.temperature_2m = [22.4, 24.2];
    partial.daily.temperature_2m_max = [31.2];
    const weather = normalizeOpenMeteoForecast(partial, validLocation());

    assert.equal(weather.current.temperature, 22.4);
    assert.equal(weather.hourly.length, 2);
    assert.equal(weather.hourly[0].isCurrent, true);
    assert.equal(weather.daily.length, 1);
    assert.ok(weather.astronomy);
});

test("une direction horaire non numerique reste indisponible sans invalider l'heure", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    fixture.hourly.wind_direction_10m[1] = "285";
    fixture.hourly.wind_direction_10m[2] = null;
    const weather = normalizeOpenMeteoForecast(fixture, validLocation());

    assert.equal(weather.hourly[0].windDirection, 280);
    assert.equal(weather.hourly[1].windDirection, null);
    assert.equal(weather.hourly[2].windDirection, null);
    assert.equal(weather.hourly.length, 4);
});

test("une metrique Air Quality partielle reste exploitable sans convertir les chaines", () => {
    const partial = normalizeAirQuality({
        current: {
            time: "2026-07-10T09:00",
            european_aqi: "24",
            pm2_5: 7.1
        }
    });
    const invalid = normalizeAirQuality({
        current: {
            time: "2026-07-10T09:00",
            european_aqi: "24"
        }
    });

    assert.equal(partial.europeanAqi, null);
    assert.equal(partial.pm25, 7.1);
    assert.equal(partial.condition.label, "Non disponible");
    assert.equal(invalid, null);
});

test("une prevision quotidienne conserve une icone diurne quel que soit l'etat courant", async () => {
    const fixture = JSON.parse(await readFile(forecastFixtureUrl, "utf8"));
    const daytime = structuredClone(fixture);
    const nighttime = structuredClone(fixture);
    daytime.current.is_day = 1;
    nighttime.current.is_day = 0;
    daytime.daily.weather_code[0] = 0;
    nighttime.daily.weather_code[0] = 0;

    const dayWeather = normalizeOpenMeteoForecast(daytime, validLocation());
    const nightWeather = normalizeOpenMeteoForecast(nighttime, validLocation());

    assert.equal(dayWeather.daily[0].condition.icon, "☀️");
    assert.equal(nightWeather.daily[0].condition.icon, "☀️");
    assert.equal(dayWeather.daily[0].condition.iconId, "clear-day");
    assert.equal(nightWeather.daily[0].condition.iconId, "clear-day");
});

function validLocation() {
    return {
        id: "toulouse-fr",
        name: "Toulouse",
        label: "Toulouse, France",
        country: "France",
        latitude: 43.6045,
        longitude: 1.444,
        timezone: "Europe/Paris"
    };
}

function createHoursAround(expected) {
    const timestamp = Date.parse(`${expected}:00Z`);
    return [-1, 0, 1, 2].map((offset) => (
        new Date(timestamp + offset * 60 * 60 * 1000).toISOString().slice(0, 16)
    ));
}

function createForecastForTimes(fixture, currentTime, times) {
    const forecast = structuredClone(fixture);
    forecast.current.time = currentTime;
    forecast.hourly = {
        time: times,
        temperature_2m: times.map((_, index) => 20 + index),
        apparent_temperature: times.map((_, index) => 20 + index),
        precipitation_probability: times.map(() => 0),
        precipitation: times.map(() => 0),
        weather_code: times.map(() => 0),
        uv_index: times.map(() => 0),
        wind_speed_10m: times.map(() => 5),
        wind_direction_10m: times.map(() => 270)
    };
    return forecast;
}

function createAirQualityHours(times, values) {
    return {
        time: times,
        european_aqi: values,
        pm10: values.map((value) => value / 2),
        pm2_5: values.map((value) => value / 4),
        ozone: values.map((value) => value + 20),
        nitrogen_dioxide: values.map((value) => value / 3)
    };
}
