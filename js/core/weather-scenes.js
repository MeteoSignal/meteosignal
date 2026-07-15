export const WEATHER_SCENES = Object.freeze({
    CLEAR_DAY: "clear-day",
    CLEAR_NIGHT: "clear-night",
    CLOUDY: "cloudy",
    RAIN: "rain",
    STORM: "storm",
    SNOW: "snow",
    FOG: "fog",
    DEFAULT: "default"
});

export const WEATHER_SCENE_IDS = Object.freeze(Object.values(WEATHER_SCENES));

const DEFAULT_SCENE = WEATHER_SCENES.DEFAULT;
const SCENES_BY_TONE = Object.freeze({
    cloudy: WEATHER_SCENES.CLOUDY,
    fog: WEATHER_SCENES.FOG,
    rain: WEATHER_SCENES.RAIN,
    storm: WEATHER_SCENES.STORM,
    snow: WEATHER_SCENES.SNOW
});

export function resolveWeatherScene(condition, isDay) {
    const tone = condition && typeof condition === "object" ? condition.tone : null;

    if (tone === "clear") {
        if (isDay === true) {
            return WEATHER_SCENES.CLEAR_DAY;
        }

        if (isDay === false) {
            return WEATHER_SCENES.CLEAR_NIGHT;
        }

        return DEFAULT_SCENE;
    }

    return SCENES_BY_TONE[tone] ?? DEFAULT_SCENE;
}
