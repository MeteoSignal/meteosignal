const latitude = 43.6045;
const longitude = 1.4440;

async function loadWeather() {
    try {
        const url = `
            https://api.open-meteo.com/v1/forecast?
            latitude=${latitude}
            &longitude=${longitude}
            &current=
                temperature_2m,
                apparent_temperature,
                relative_humidity_2m,
                wind_speed_10m,
                weather_code,
                pressure_msl,
                precipitation
            &daily=
                temperature_2m_max,
                temperature_2m_min,
                weather_code
            &timezone=auto
        `;

        const response = await fetch(url.replace(/\s/g, ""));

        if (!response.ok) {
            throw new Error("La météo est momentanément indisponible.");
        }

        const data = await response.json();
        const current = data.current;
        const today = {
            min: data.daily.temperature_2m_min[0],
            max: data.daily.temperature_2m_max[0]
        };

        setText("#city", CONFIG.city);
        setText("#temp", `${Math.round(current.temperature_2m)}°`);
        setText("#description", weatherDescription(current.weather_code));
        setText("#wind", `${Math.round(current.wind_speed_10m)} km/h`);
        setText("#humidity", `${current.relative_humidity_2m} %`);
        setText("#pressure", `${Math.round(current.pressure_msl)} hPa`);
        setText("#precipitation", `${current.precipitation ?? 0} mm`);
        setText("#feels-like", `${Math.round(current.apparent_temperature)}°`);
        setText("#temp-min", `${Math.round(today.min)}°`);
        setText("#temp-max", `${Math.round(today.max)}°`);
        setText("#icon", weatherIcon(current.weather_code));

        showForecast(data);
    } catch (error) {
        console.error(error);
        setText("#description", "Données météo indisponibles.");
    }
}

function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
        element.textContent = value;
    }
}

function weatherIcon(code) {
    if (code <= 1) {
        return "☀️";
    }

    if (code <= 3) {
        return "⛅";
    }

    if (code <= 67) {
        return "🌧️";
    }

    if (code <= 77) {
        return "❄️";
    }

    return "⛈️";
}

function weatherDescription(code) {
    if (code === 0) {
        return "Ciel dégagé";
    }

    if (code <= 3) {
        return "Nuages variables";
    }

    if (code <= 48) {
        return "Brume ou brouillard";
    }

    if (code <= 67) {
        return "Pluie possible";
    }

    if (code <= 77) {
        return "Neige possible";
    }

    return "Temps instable";
}

function showForecast(data) {
    const box = document.querySelector("#forecast");

    if (!box) {
        return;
    }

    box.innerHTML = "";

    for (let i = 0; i < 7; i += 1) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <span>${formatForecastDay(data.daily.time[i])}</span>
            <strong>${weatherIcon(data.daily.weather_code[i])}</strong>
            <span>${Math.round(data.daily.temperature_2m_max[i])}°</span>
        `;

        box.appendChild(card);
    }
}

function formatForecastDay(dateValue) {
    return new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        day: "2-digit"
    }).format(new Date(dateValue));
}

loadWeather();
setInterval(loadWeather, CONFIG.refresh);
