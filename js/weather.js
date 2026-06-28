console.log("METEO DEMARRE");
const latitude = 43.6045;
const longitude = 1.4440;


async function loadWeather() {


const url =
`https://api.open-meteo.com/v1/forecast?
latitude=${latitude}
&longitude=${longitude}
&current=
temperature_2m,
relative_humidity_2m,
wind_speed_10m,
weather_code
&daily=
temperature_2m_max,
temperature_2m_min,
weather_code`;



const response =
await fetch(url.replace(/\s/g,""));


const data =
await response.json();

console.log(data);

document.querySelector("#temp")
.textContent =
Math.round(
data.current.temperature_2m
)
+"°";



document.querySelector("#wind")
.textContent =
data.current.wind_speed_10m
+" km/h";



document.querySelector("#humidity")
.textContent =
data.current.relative_humidity_2m
+" %";



const city = "Toulouse";

document.querySelector("#city").textContent = city;



document.querySelector("#icon")
.textContent =
weatherIcon(
data.current.weather_code
);



showForecast(data);


}



function weatherIcon(code){


if(code <= 1)
return "☀️";


if(code <= 3)
return "⛅";


if(code <= 67)
return "🌧️";


if(code <= 77)
return "❄️";


return "⛈️";

}



function showForecast(data){


const box =
document.querySelector("#forecast");


box.innerHTML="";



for(let i=0;i<7;i++){


box.innerHTML +=

`
<div class="card">

${data.daily.time[i]}

<br>

${weatherIcon(
data.daily.weather_code[i]
)}

<br>

${Math.round(
data.daily.temperature_2m_max[i]
)}°

</div>
`;

}


}



loadWeather();


setInterval(
loadWeather,
600000
);
