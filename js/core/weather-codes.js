const WEATHER_CODES = new Map([
    [0, { label: "Ciel dégagé", icon: "☀️", tone: "clear", iconDay: "clear-day", iconNight: "clear-night" }],
    [1, { label: "Principalement dégagé", icon: "🌤️", tone: "clear", iconDay: "clear-day", iconNight: "clear-night" }],
    [2, { label: "Partiellement nuageux", icon: "⛅", tone: "cloudy", iconDay: "partly-cloudy-day", iconNight: "partly-cloudy-night" }],
    [3, { label: "Couvert", icon: "☁️", tone: "cloudy", iconDay: "cloudy", iconNight: "cloudy" }],
    [45, { label: "Brouillard", icon: "🌫️", tone: "fog", iconDay: "fog-day", iconNight: "fog-day" }],
    [48, { label: "Brouillard givrant", icon: "🌫️", tone: "fog", iconDay: "fog-day", iconNight: "fog-day" }],
    [51, { label: "Bruine faible", icon: "🌦️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [53, { label: "Bruine modérée", icon: "🌦️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [55, { label: "Bruine dense", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [56, { label: "Bruine verglaçante faible", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [57, { label: "Bruine verglaçante dense", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [61, { label: "Pluie faible", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [63, { label: "Pluie modérée", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [65, { label: "Pluie forte", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [66, { label: "Pluie verglaçante faible", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [67, { label: "Pluie verglaçante forte", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [71, { label: "Neige faible", icon: "🌨️", tone: "snow" }],
    [73, { label: "Neige modérée", icon: "🌨️", tone: "snow" }],
    [75, { label: "Neige forte", icon: "❄️", tone: "snow" }],
    [77, { label: "Grains de neige", icon: "❄️", tone: "snow" }],
    [80, { label: "Averses faibles", icon: "🌦️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [81, { label: "Averses modérées", icon: "🌧️", tone: "rain", iconDay: "light-rain-day", iconNight: "light-rain-day" }],
    [82, { label: "Averses fortes", icon: "⛈️", tone: "storm", iconDay: "storm-day", iconNight: "storm-day" }],
    [85, { label: "Averses de neige faibles", icon: "🌨️", tone: "snow" }],
    [86, { label: "Averses de neige fortes", icon: "❄️", tone: "snow" }],
    [95, { label: "Orage", icon: "⛈️", tone: "storm", iconDay: "storm-day", iconNight: "storm-day" }],
    [96, { label: "Orage avec grêle faible", icon: "⛈️", tone: "storm", iconDay: "storm-day", iconNight: "storm-day" }],
    [99, { label: "Orage avec grêle forte", icon: "⛈️", tone: "storm", iconDay: "storm-day", iconNight: "storm-day" }]
]);

const NIGHT_ICONS = new Map([
    [0, "🌙"],
    [1, "🌙"],
    [2, "🌙☁️"]
]);

export function getWeatherCondition(code, isDay = true) {
    const numericCode = Number(code);

    if (code === null || code === undefined || code === "" || !Number.isFinite(numericCode)) {
        return {
            code: null,
            label: "Conditions indisponibles",
            icon: "🌡️",
            tone: "unknown"
        };
    }

    const condition = WEATHER_CODES.get(numericCode) ?? {
        label: "Conditions variables",
        icon: "🌡️",
        tone: "unknown"
    };

    return {
        code: numericCode,
        label: condition.label,
        icon: isDay ? condition.icon : NIGHT_ICONS.get(numericCode) ?? condition.icon,
        iconId: isDay ? condition.iconDay ?? null : condition.iconNight ?? condition.iconDay ?? null,
        tone: condition.tone
    };
}
