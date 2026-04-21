//// LEGEND ////
// <<<<<<<<<<<<<<< DEMO DAY RELATED THINGS

import { stateMachine } from "./stateMachine.js";

export function selectedCharacter({
  // container holding the rendered Lottie animation from the .json file
  lottieContainer,

  // path leading to the lottie file
  lottiePath,

  // if no options object is passed in, default it to an empty object {}
  // if it’s an empty object, all features default to true (e.g. enablePat = true)
  options = {}
}) {
  const {
    enablePat = true,
    enableStretch = true,
    enableHydrate = true,
    debug = true
  } = options;


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// INTERNAL HELPERS ////

  // collect all arguments (...args) into an array and console.log them
  // only runs if debug is true
  function log(...args) {
    if (debug) console.log(...args);
  }

  // helper function that returns the frame range (i.e. { start, end }) from segment gotten from stateMachine.js
  function f(segment) {
    return stateMachine.get(segment);
  }


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// STATE SETUP ////
  //// assigning variables to default states

  // ANIMATION RELATED
  // for looping animations
  let activeLoop = null;

  // for play-once animations
  let playingOnce = null;

  // TIME CHECKER
  // for quarter hour timer
  let quartHrTimeout = null;

  // for STRETCH & HYDRATE state
  let pendingStretch = false;
  let pendingHydrate = false;

  // for PATTING state
  let isPatting = false;
  let rMousePressed = false;

  // FOR SLEEP STATE
  // for time range purposes (11:30pm -> 7:00am)
  let isSleeping = false;
  let sleepTickInterval = null;

  // time stamp (ms) that MiniKin should stay awake
  // (i.e Date.now() < resumeSleepAfterMs, stay awake)
  let resumeSleepAfterMs = null; // 

  // FOR MODE SWITCHING (default <-> rain)
  // mode switching safety
  let queuedMode = null;


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// LOTTIE SETUP ////

  const animation = window.lottie.loadAnimation({
    container: lottieContainer,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: lottiePath
  });


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// ANIMATION HELPER FUNCTIONS ////
  
  // FUNCTION FOR ANIMATIONS THAT PLAY ONCE
  function playOnce(range, playOnceName) {
    // if range does not exist, exit function
    if (!range) return;
    
    // otherwise
    log(`playOnce [${playOnceName}] ${range.start} → ${range.end}`);

    playingOnce = playOnceName;
    activeLoop = null;

    // prevent looping after reaching end of range
    animation.loop = false;

    // stop immediately and reset to frame 0 of entire lottie animation (so that switching animations midway is clean)
    animation.stop();

    // start playing given range from start to end
    animation.playSegments([range.start, range.end], true);
  }

  // FUNCTION FOR ANIMATIONS THAT LOOP
  function startLoop(range, loopName) {
    if (!range) return;
    log(`startLoop [${loopName}] ${range.start}–${range.end}`);

    playingOnce = null;
    activeLoop = loopName;

    animation.loop = true;
    animation.stop();
    animation.playSegments([range.start, range.end], true);
  }

  // ASSIGNING FUNCTIONS TO LOOP AND PLAY-ONCE ANIMATIONS
  // loop animations
  function startIdleLoop() {
    startLoop(f("IDLE"), "idle"); // (range, loopName)
  }

  function startPatLoop() {
    startLoop(f("PAT_LOOP"), "pat_loop");
  }

  // play once animations
  function playPatRevert() {
    playOnce(f("PAT_REVERT"), "pat_revert"); // (range, playOnceName)
  }

  function playStretch() {
    playOnce(f("STRETCH"), "stretch");
  }

  function playHydrate() {
    playOnce(f("HYDRATE"), "hydrate");
  }

  // IMPORTANT NOTE:
  // sleep animations are in the SLEEP STATE section because they depend on sleep rules and wake logic


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// PATTING STATE ////
  
  // FUNCTION FOR BEGIN PATTING
  function beginPat() {
    // if pat not enabled, exit function
    if (!enablePat) return;
    // if sleeping, exit function (block patting when sleeping)
    if (isSleeping) return;
    // if already patting, exit function
    if (isPatting) return;

    // otherwise
    isPatting = true;
    log("beginPat");

    // if pat_loop is already playing, exit function
    if (activeLoop === "pat_loop") return;
    // if pat_in is already playing, exit function
    if (playingOnce === "pat_in") return;
    // otherwise
    playOnce(f("PAT_IN"), "pat_in");
  }

  // FUNCTION FOR END PATTING
  function endPat() {
    if (!enablePat) return;
    if (isSleeping) return;
    if (!isPatting) return;

    isPatting = false;
    log("endPat");

    if (activeLoop === "pat_loop") {
      playPatRevert();
    }
  }

  // ONLY WHEN enablePat = true
  if (enablePat) {
    // prevent right click from defaulting to opening the browser context menu
    lottieContainer.addEventListener("contextmenu", (e) => e.preventDefault());

    // begin patting when right mouse button is down
    lottieContainer.addEventListener("mousedown", (e) => {
      // 2 = right mouse btn (0 = left mouse btn, 1 = middle mouse btn)
      if (e.button === 2) {
        rMousePressed = true;
        beginPat();
        e.preventDefault();
      }
    });

    // continue patting while mouse is moving with right mouse button down
    window.addEventListener("mousemove", () => {
      if (rMousePressed) beginPat();
    });

    // end patting when right mouse button is released
    window.addEventListener("mouseup", (e) => {
      if (e.button === 2) {
        rMousePressed = false;
        endPat();
      }
    });

    // in case user alt-tabs while right mouse button is down
    // toggle rMousePressed = false so patting ends, so that MiniKin isn't stuck in a patting loop
    // "blur" means window loses focus (e.g minimized, switch windows)
    window.addEventListener("blur", () => {
      rMousePressed = false;
      endPat();
    });
  }

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// HYDRATE + STRETCH STATES ////

  /// QUEUE + DISPATCH
  // for when stretch and hydrate are triggered at the same time
  
  // GATE
  // function to determine if play-once animation (i.e. stretch/hydrate) is allowed to be played now
  function canPlayOnceNow() {
    // can play if
    return (
      // not sleeping
      !isSleeping &&
      // not being patted 
      !isPatting && 
      // not playing pat_loop animation
      activeLoop !== "pat_loop" && 
      // not playing any play-once animation 
      !playingOnce
    );
  }

  // REQUEST (i.e. queue)
  function queueSegment(segmentName) {
    if (segmentName === "stretch") pendingStretch = true;
    if (segmentName === "hydrate") pendingHydrate = true;

    tryDispatch();
  }

  // DISPATCHER
  function tryDispatch() {
    // if canPlayOnceNow() returns false (i.e. not allowed to be played), exit function
    if (!canPlayOnceNow()) return;

    // otherwise
    // stretch first, then hydrate
    // if pendingStretch = true, enableStretch = true, and "STRETCH" segment exists
    if (pendingStretch && enableStretch && f("STRETCH")) {
      // clear pendingStretch from queue to prevent repeating
      pendingStretch = false;
      playStretch();
      // exit so hydrate doesn't interrupt stretch
      return;
    }

    // tryDispatch() will run again when "complete" event fires (see COMPLETE HANDLER section)
    // to dispatch hydrate next
    if (pendingHydrate && enableHydrate && f("HYDRATE")) {
      pendingHydrate = false;
      playHydrate();
      return;
    }
  }

  
  /// CLOCK SCHEDULER FOR HYDRATE + STRETCH
  // when system clock reads :15 or :45 -> hydrate only
  // when system clock reads :00 or :30 -> stretch then hydrate
  
  // CALCULATE - HOW MANY MS UNTIL NEXT 15 MIN MARK ON SYSTEM CLOCK
  function msUntilNextQuartHr() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = now.getMilliseconds();

    // ***ORIGINAL VERSION (UNCOMMENT AFTER DEMO DAY)
    // calculate how many mins UNTIL next 15 min mark
    // const minutesToGo = 15 - (minutes % 15);

    
    // ***DEMO DAY PURPOSES (REMOVE AND UNCOMMENT ABOVE AFTER DEMO DAY 1/3) <<<<<<<<<<<<<<<
    // ANCHOR - stretch + hydrate timings (1/3)
    const minutesToGo = 5 - (minutes % 5);

    // convert minutesToGo to ms and subtract the ms that passed this minute
    // to get exactly 00:15:00 marks -> for times MiniKin is launched at odd times (e.g 00:15:32 instead of 00:15:00)
    return Math.max(0, minutesToGo * 60 * 1000 - seconds * 1000 - ms);
  }


  // SCHEDULE - MINIKIN'S QUART HOUR BEHAVIOR
  // reminder: 'timeout' means waiting period (i.e countdown)
  // function to cancel currently scheduled quart-hour countdown
  function stopQuartHrSchedule() {
    if (quartHrTimeout) clearTimeout(quartHrTimeout);
    quartHrTimeout = null;
  }

  // set time-based rules
  // to determine what MiniKin should do each quart hour tick (i.e. stretch/hydrate) on system clock
  function onQuartHrTick() {
    // don’t trigger stretch/hydrate while sleeping
    if (isSleeping) {
      log("Quarter hour tick ignored because MiniKin is sleeping");
      return;
    }

    const now = new Date();
    const m = now.getMinutes();

    // to check if quart hour tick is firing correctly
    // (should always read 15, 30, 45, 00)
    log("Quarter hour tick at minute:", m);

    
    // ***ORIGINAL VERSION (UNCOMMENT AFTER DEMO DAY)
    // if minutes read 15 or 45
    // if (m === 15 || m === 45) {
    //   queueSegment("hydrate");
    //   return;
    // }

    // ***DEMO DAY PURPOSES (REMOVE AND UNCOMMENT ABOVE AFTER DEMO DAY 2/3) <<<<<<<<<<<<<<<
    // stretch and hydrate every 10 mins on system clock (switched with original logic for priority purposes)
    // ANCHOR - stretch + hydrate timings (2/3)
    if (m === 0 || m === 10 || m === 20 || m === 30 || m === 40 || m === 50) {  
      queueSegment("stretch");
      queueSegment("hydrate");
    return;
    }
  

    
    // ***ORIGINAL VERSION (UNCOMMENT AFTER DEMO DAY)
    // if minutes read 00 or 30
    //   if (m === 0 || m === 30) {
    //     queueSegment("stretch");
    //     queueSegment("hydrate");
    //     return;
    //   }

    // ***DEMO DAY PURPOSES (REMOVE AND UNCOMMENT ABOVE AFTER DEMO DAY 3/3) <<<<<<<<<<<<<<<
    // hydrate every 5 mins on system clock
    // ANCHOR - stretch + hydrate timings (3/3)
    if (m === 5 || m === 15 || m === 25 || m === 35 || m === 45 || m === 55) {
      queueSegment("hydrate");
    return;
    }
}


  // start a quart hour scheduler aligned to the system clock
  function startQuartHrSchedule() {
    // stop current quart hour schedule to make a new one
    stopQuartHrSchedule();

    // internal helper function to schedule next quart hour execution
    const scheduleNext = () => {
      const wait = msUntilNextQuartHr();
      log("Milliseconds until next quarter hour:", wait);

      // set quart hour countdown
      quartHrTimeout = setTimeout(() => {
        onQuartHrTick();
        scheduleNext();
      }, wait);
    };

    scheduleNext();
  }

  
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// SLEEP STATE ////
  //// helper functions

  /// SET TIME RANGE MINIKIN IS ASLEEP (11:30PM -> 7:00AM)
  function isInSleepWindow(now = new Date()) {
    const mins = now.getHours() * 60 + now.getMinutes();
    // 11:30pm expressed in total mins since midnight
    // ON DEMO DAY: change this to make MiniKin sleep at an earlier time <<<<<<<<<<<<<<<
    // ANCHOR - change sleep time (need to change in app.js too)
    const start = 23 * 60 + 30;
    // 7:00am expressed in total mins since midnight
    const end = 7 * 60;
    // after start (11.30pm) OR before end (7:00am)         
    return mins >= start || mins < end;
  }

  /// ASSIGN FUNCTIONS TO SLEEP ANIMATIONS
  function startSleepLoop() {
    startLoop(f("SLEEP_LOOP"), "sleep");
    isSleeping = true;
  }

  function playSleepIn() {
    if (isSleeping) return;
    log("playSleepIn()");

    isSleeping = true;
    isPatting = false;
    rMousePressed = false;

    playOnce(f("SLEEP_IN"), "sleep_in");
  }

  function playSleepRevert() {
    if (!isSleeping) return;
    log("playSleepRevert()");

    isSleeping = false;
    playOnce(f("SLEEP_REVERT"), "sleep_revert");
  }

  /// APPLY TIME-BASED SLEEP RULES
  function applySleepRulesNow() {
    const inSleepWindow = isInSleepWindow();

    // if not within sleep window (aka outside of 7am - 11:30pm window)
    if (!inSleepWindow) {
      // clear click-to-wake window
      if (resumeSleepAfterMs) {
        log("Clearing resumeSleepAfterMs");
        resumeSleepAfterMs = 0;
      }

      // if still sleeping after 7am, auto-wake
      if (isSleeping) {
        log("Past 7am detected -> auto-wake");
        playSleepRevert();
      }
      return;
    }

    // if inSleepWindow
    // if MiniKin was woken up (via click-to-wake), stay awake for a bit
    if (Date.now() < resumeSleepAfterMs) return;

    // otherwise
    // playSleepIn
    if (!isSleeping) playSleepIn();
  }

  /// TO WATCH MINIKIN'S BEHAVIOR WHEN WITHIN SLEEP WINDOW
  function startSleepWindowWatcher() {
    // if sleep interval already exists, clear it
    // to prevent another loop from being created every time this startSleepWindowWatcher is called
    if (sleepTickInterval) clearInterval(sleepTickInterval);

    applySleepRulesNow();

    // every 5 secs, run applySleepRulesNow for responsiveness
    sleepTickInterval = setInterval(applySleepRulesNow, 5 * 1000);
  }

  /// CLICK-TO-WAKE EVENT HANDLER
  lottieContainer.addEventListener("click", () => {
    if (!isSleeping) return;

    log("Click-to-wake detected -> staying awake for 5 min");

    // stay awake for 5 minutes
    resumeSleepAfterMs = Date.now() + 5 * 60 * 1000;

    playSleepRevert();
  });


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// WEATHER MODE SWITCHING ////
  //// setup for renderer.js

  function setMode(nextMode) {
    // if next mode is both not default, rain and pyjamas simultaneously, exit function
    if (!stateMachine.frames[nextMode]) return;
    // if current mode is the next the next mode, exit function
    if (stateMachine.mode === nextMode) return;

    // prevent interrupting playOnce animations
    if (playingOnce) {
      log("Following mode change queued until playOnce animation completes:", nextMode);
      queuedMode = nextMode;
      return;
    }

    // set next mode
    stateMachine.setMode(nextMode);
    log("Mode set to:", stateMachine.mode);

    // refresh current mode's loop animation to reflect new mode's
    if (isSleeping) startSleepLoop();
    else if (isPatting) startPatLoop();
    else startIdleLoop();
  }


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// STARTUP ////

  animation.addEventListener("DOMLoaded", () => {
    log("LOTTIE LOADED");
    log("Total frames:", animation.totalFrames);

    startIdleLoop();
    startQuartHrSchedule();
    startSleepWindowWatcher();
  });


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// COMPLETE HANDLER ////
  //// when (any) playOnce animation finishes playing run this function
  
  animation.addEventListener("complete", () => {
    log("COMPLETE:", playingOnce);

    // if a mode change was queued, apply it right after the one-shot ends
    if (queuedMode && playingOnce) {
      stateMachine.setMode(queuedMode);
      log("one-shot completed, queued mode applied:", stateMachine.mode);
      queuedMode = null;
    }

    /// PLAYONCE ANIMATION BEHAVIORS AFTER EACH ONE FINISHES 
    if (playingOnce === "sleep_in") {
      playingOnce = null;
      if (isSleeping) startSleepLoop();
      else startIdleLoop();
      // check if any playOnce animation is queued (i.e pendingStretch / pendingHydrate)
      tryDispatch(); 
      return;
    }

    if (playingOnce === "sleep_revert") {
      playingOnce = null;
      startIdleLoop();
      tryDispatch();
      return;
    }

    if (playingOnce === "pat_in") {
      playingOnce = null;
      if (isPatting) startPatLoop();
      else playPatRevert();
      return;
    }

    if (playingOnce === "pat_revert") {
      playingOnce = null;
      startIdleLoop();
      tryDispatch();
      return;
    }

    if (playingOnce === "stretch") {
      playingOnce = null;
      startIdleLoop();
      tryDispatch();
      return;
    }

    if (playingOnce === "hydrate") {
      playingOnce = null;
      startIdleLoop();
      tryDispatch();
      return;
    }

    // fallback -> if playOnce animation finished but wasn't handled above
    // reset and resume the loop based on current state
    playingOnce = null;
    if (isSleeping) startSleepLoop();
    else if (isPatting) startPatLoop();
    else startIdleLoop();
    tryDispatch();
  });


//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\
  //// PUBLIC API ////
  //// select what variables and functions within selectedCharacter() are to be made accessible in other files

  return {
    startIdleLoop,
    startQuartHrSchedule,
    playStretch,
    playHydrate,
    setMode,

    // for when reinitializing MiniKin (e.g. switching characters, reloading animations)
    // stop timers and destroy animation from previous instance
    destroy() {
      stopQuartHrSchedule();
      if (sleepTickInterval) clearInterval(sleepTickInterval);
      sleepTickInterval = null;
      animation.destroy();
    }
  };
}