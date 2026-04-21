// src/characters/hopper.js
export const hopper = {
  id: "hopper",
  name: "Hopper",
  lottiePath: "./assets/Hopper/hopper-default+rain.json",
  modes: ["default", "rain"], // helps me keep track of whats in the json

  websiteGIFs: {
    idle: "./assets/Hopper/anim_Option-C_Hopper_default_idle_white-BG.gif",
    rain: "./assets/Hopper/hopper_rain-idle.gif",
    patting: "./assets/Hopper/hopper_pat.gif",
    hydrate: "./assets/Hopper/hopper_hydrate.gif",
    stretch: "./assets/Hopper/hopper_stretch.gif",
    sleep: "./assets/Hopper/hopper_sleep.gif",
  }
};