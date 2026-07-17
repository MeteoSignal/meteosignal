import { WEATHER_SCENES } from "./weather-scenes.js?v=1.5.1-release";

const SCENE_ASSET_PATHS = Object.freeze({
    [WEATHER_SCENES.CLEAR_DAY]: "../../assets/backgrounds/hero/hero-clear-day.webp",
    [WEATHER_SCENES.CLEAR_NIGHT]: "../../assets/backgrounds/hero/hero-clear-night.webp",
    [WEATHER_SCENES.CLOUDY]: "../../assets/backgrounds/hero/hero-cloudy.webp",
    [WEATHER_SCENES.RAIN]: "../../assets/backgrounds/hero/hero-rain.webp",
    [WEATHER_SCENES.STORM]: "../../assets/backgrounds/hero/hero-storm.webp",
    [WEATHER_SCENES.SNOW]: "../../assets/backgrounds/hero/hero-snow.webp",
    [WEATHER_SCENES.FOG]: "../../assets/backgrounds/hero/hero-fog.webp"
});

export function resolveWeatherSceneAsset(scene) {
    const path = SCENE_ASSET_PATHS[scene];

    return path ? new URL(path, import.meta.url).href : null;
}
