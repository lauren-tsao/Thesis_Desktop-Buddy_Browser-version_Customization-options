import { selectedCharacter } from "./character.js";
import { stateMachine } from "./stateMachine.js";
import { hopper } from "./characters/hopper-all.js";
import { groovy } from "./characters/groovy-all.js";
import { turnip } from "./characters/turnip-all.js";

//// ELEMENTS ////

const minikin = document.getElementById("minikin");

const bubble = document.getElementById("bubble");
const bubbleText = document.getElementById("bubbleText");
const input = document.getElementById("bubbleInput");
const sendBtn = document.getElementById("bubbleSend");

// character switch buttons
const hopperBtn = document.getElementById("hopperBtn");
const groovyBtn = document.getElementById("groovyBtn");
const turnipBtn = document.getElementById("turnipBtn");


//// MINIKIN CHARACTER ////

// character choices
const characters = {
  hopper,
  groovy,
  turnip
};

let currentCharacter = "hopper";
let character;
let lastRainState = null;

function loadCharacter(name) {
  if (!characters[name]) return;

  currentCharacter = name;

  // remove old character from container
  minikin.innerHTML = "";

  // create new character
  character = selectedCharacter({
    lottieContainer: minikin,
    lottiePath: characters[currentCharacter].lottiePath,
    frames: stateMachine.frames,
    options: {
      enablePat: true,
      enableStretch: true,
      enableHydrate: true,
      debug: true
    }
  });

  // restart hydration/stretch schedule for new character
  character.startQuartHrSchedule();

  // keep current weather mode after switching
  if (lastRainState !== null) {
    const nextMode = lastRainState ? "rain" : "default";
    character.setMode(nextMode);
  }
}


//// BUBBLE UI ////

function showBubble(text) {
  bubbleText.textContent = text;
  bubble.classList.remove("hidden");
  setTimeout(() => input.focus(), 0);
}

function hideBubble() {
  bubble.classList.add("hidden");
}

function toggleBubble() {
  const isHidden = bubble.classList.contains("hidden");
  if (isHidden) showBubble("Hi there! My name is MiniKin, ask me about my features!");
  else hideBubble();
}


//// MINIKIN'S BRAIN ////

function getSimpleAnswer(q) {
  const qSent = q.trim().toLowerCase();

  if (!qSent) return "Hi there! My name is MiniKin, ask me about any of my features!";
  if (qSent.includes("features")) return "I have 4 features: wellness checks, event notifications, weather updates and bedtime reminders!";
  if (qSent.includes("hello") || qSent.includes("hi") || qSent.includes("hey")) return "Hi!";
  if (qSent.includes("how are you")) return "Hopping along fine, hope you are too!";
  if (qSent.includes("your name")) return "I’m MiniKin, nice to meet you!";
  if (qSent.includes("event")) return "I notify you about events in your calender. Today I am wearing a birthday hat because it's someone's birthday on my creator's calendar!";
  if (qSent.includes("wellness checks")) return "I remind you to hydrate every 15 minutes and stretch every 30 minutes. Hope you can join me!";
  if (qSent.includes("hydrate") || qSent.includes("hydration") || qSent.includes("water")) return "I remind you to hydrate every 15 minute mark on the clock by drinking water!";
  if (qSent.includes("stretch") || qSent.includes("stretching") || qSent.includes("break")) return "I remind you to stretch every 30 minute mark on the clock by stretching. Hope you join me!";
  if (qSent.includes("bed") || qSent.includes("sleep")) return "I'll let you know when its time to sleep at 11.30pm and will wake up at 7.00am You can wake me up before then by clicking on me!";

  return "Oh! I'm sorry, I’m not sure about that. But I’m slowly learning!";
}


//// WEATHER ////

const OWM_KEY = "1357e705f9671628bac2004c1f0f736a";

// true = always rain
// false = always default
// null = actual weather
let FORCE_RAIN = null;

// default location
let WEATHER_CITY = "San Francisco,US";


async function getWeather(city = WEATHER_CITY) {

  if (FORCE_RAIN === true) {
    return "It’s 72°F with light rain.";
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OWM_KEY}&units=imperial`;

  const response = await fetch(url);

  if (!response.ok) throw new Error("Weather lookup failed");

  const data = await response.json();

  const temp = Math.round(data.main.temp);
  const description = data.weather?.[0]?.description ?? "unknown conditions";

  const isRain =
  description.includes("rain") ||
  description.includes("drizzle") ||
  description.includes("thunderstorm");

  if (temp <= 32)
    return `It’s ${temp}°F with ${description}. That's freezing! Please stay warm.`;

  if (isRain) {
    return `It’s ${temp}°F with ${description}. It's raincoat weather!`
  }

  return `It’s ${temp}°F with ${description}. If it starts to rain I will wear a raincoat!`;
}


//// WEATHER MODE SWITCHING ////

async function getIsRaining(city = WEATHER_CITY) {

  if (FORCE_RAIN !== null) {
    console.log("Forced rain ON:", FORCE_RAIN);
    return FORCE_RAIN;
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OWM_KEY}&units=imperial`;

  const response = await fetch(url);

  if (!response.ok) throw new Error("Weather lookup failed");

  const data = await response.json();

  const main = (data.weather?.[0]?.main ?? "").toLowerCase();

  return (
    main === "rain" ||
    main === "drizzle" ||
    main === "thunderstorm"
  );
}


async function pollWeatherAndUpdateMode() {

  try {

    const isRaining = await getIsRaining(WEATHER_CITY);

    if (lastRainState !== isRaining) {

      lastRainState = isRaining;

      const nextMode = isRaining ? "rain" : "default";

      console.log("Weather mode:", nextMode);

      character.setMode(nextMode);

    }

  } catch (e) {

    console.log("Weather poll failed:", e);

  }

}


//// SENDING QUESTIONS ////

async function sendQuestion() {

  const q = input.value.trim();
  input.value = "";

  if (!q) {

    showBubble("Oh! I'm sorry, could you type that again please?");
    return;

  }

  const qSent = q.toLowerCase();

  const unknownCityMsg =
    "Oh! I'm sorry, I’m not sure about that. But I’m slowly learning!";

  try {

    if (
      qSent.includes("weather") ||
      qSent.includes("temperature") ||
      qSent.includes("temp")
    ) {

      const match = q.match(/in\s+(.+)$/i);

      const city = match ? match[1].trim() : WEATHER_CITY;

      showBubble(await getWeather(city));

      return;
    }

    // FOR ASKING TIME & DATE IN OTHER CITIES
    // if (qSent.includes("time") || qSent.includes("date")) {

    //   const CITY_TIMEZONES = {

    //     tokyo: "Asia/Tokyo",
    //     singapore: "Asia/Singapore",
    //     london: "Europe/London"

    //   };

    //   const match = q.match(/in\s+(.+)$/i);

    //   const city = match?.[1]?.trim().toLowerCase();

    //   const timezone = CITY_TIMEZONES[city];

    //   if (!timezone) {

    //     showBubble(unknownCityMsg);
    //     return;

    //   }

    //   const cityDisplay =
    //     city.charAt(0).toUpperCase() + city.slice(1);

    //   const dateTime = new Date().toLocaleString([], {

    //     timeZone: timezone,
    //     weekday: "long",
    //     year: "numeric",
    //     month: "long",
    //     day: "numeric",
    //     hour: "2-digit",
    //     minute: "2-digit"

    //   });

    //   showBubble(`It’s ${dateTime} in ${cityDisplay}.`);

    //   return;
    // }

    showBubble(getSimpleAnswer(q));

  } catch {

    showBubble("That's strange, I couldn’t fetch the weather.");

  }

}


//// EVENTS ////

minikin.addEventListener("click", () => {

  toggleBubble();

});

sendBtn.addEventListener("click", sendQuestion);


input.addEventListener("keydown", (e) => {

  if (e.key === "Enter") sendQuestion();

  if (e.key === "Escape") hideBubble();

});

// character switch buttons
hopperBtn.addEventListener("click", () => loadCharacter("hopper"));
groovyBtn.addEventListener("click", () => loadCharacter("groovy"));
turnipBtn.addEventListener("click", () => loadCharacter("turnip"));


//// INITIALIZE ////

// ANCHOR - FORCE RAIN TOGGLE
// set weather override
FORCE_RAIN = null;

loadCharacter(currentCharacter);

// run weather check
pollWeatherAndUpdateMode();

// check every 15 minutes
setInterval(pollWeatherAndUpdateMode, 15 * 60 * 1000);