// src/stateMachine.js
// MINIKIN STATES

export const stateMachine = {
  
  // mode on startup
  mode: "default",

  // frame segments grouped by mode
  frames: {
    
    //// DEFAULT MODE ////
    default: {
      IDLE: { start: 0, end: 99 },

      // patting segment
      PAT_IN: { start: 100, end: 124 },
      PAT_LOOP: { start: 125, end: 149 },
      PAT_REVERT: { start: 150, end: 174 },

      // sleep segment
      SLEEP_IN: { start: 175, end: 249 },
      SLEEP_LOOP: { start: 250, end: 324 },
      SLEEP_REVERT: { start: 325, end: 349 },

      // stretch segment
      STRETCH: { start: 350, end: 424 },

      // hydrate segment
      HYDRATE: { start: 425, end: 574 }
    },


    //// RAIN MODE ////
    rain: {
      IDLE: { start: 575, end: 674 },

      // patting segment
      // DO NOT follow markers for DB_Character_Animations.aep for this segment
      // this is the correct frame range
      PAT_IN: { start: 675, end: 692 },
      PAT_LOOP: { start: 693, end: 719 },
      PAT_REVERT: { start: 720, end: 749 },

      // sleep segment
      SLEEP_IN: { start: 750, end: 824 },
      SLEEP_LOOP: { start: 825, end: 899 },
      SLEEP_REVERT: { start: 900, end: 924 },

      // stretch segment
      STRETCH: { start: 925, end: 999 },

      // hydrate segment
      HYDRATE: { start: 1000, end: 1149 }
    }
  },

  //// SET MODE ////

  // check if requested mode is either default or rain
  // if neither, exit function without changing mode (i.e. return false)
  // if either, updates current mode (i.e. return true)
  setMode(nextMode) {
    if (nextMode !== "default" && nextMode !== "rain") return false;
    this.mode = nextMode;
    return true;
  },

  //// GET FRAME SEGMENT FOR CURRENT MODE ////
  
  get(segment) {
    // modeFrames = frames from current mode (e.g. this.frames.rain gets all frames in rain mode)
    const modeFrames = this.frames[this.mode];

    // SAFETY CHECK
    // if current mode doesn't exist OR requested segment does not exist within that mode
    // stop execution and throw the following error (removing this line will result in a vague error like 'cannot read properties of undefined)
    if (!modeFrames || !modeFrames[segment]) {
      throw new Error(
        `Missing frames for segment "${segment}" in mode "${this.mode}"`
      );
    }

    // from current mode's frames, return frame range for requested segment
    return modeFrames[segment];
  }
};