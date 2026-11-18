var tiltbeta = 0, tiltgamma = 0, tiltalpha = 0;
var accelX = 0, accelY = 0, accelZ = 0;
var xPosition = 0, yPosition = 0;

let flyImage, frogImage, bgImage;
let introVid, winVid, loseVid;

var cars = [];
var frogPos;

// Game State & Timer
let state = 0; // 0 = Intro Cutscene, 1 = Playing, 2 = Win, 3 = Lose
let timer = 15; // 15 seconds to cut all grass
let motionEnabled = false;
let lastTapTime = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);

  frogPos = createVector(width / 2, height - 80);

  // Load Images
  flyImage = await loadImage("blade.png");
  frogImage = await loadImage("mower.png");
  bgImage = await loadImage("grass.jpeg");

  // Load Videos (Tries .mp4 first, falls back to .mov automatically)
  introVid = createVideo(["cutscene.mov"], () => {
    setupMobileVideo(introVid);
  });
  introVid.onended(() => switchState(1));

  winVid = createVideo(["win.mov"], () => {
    setupMobileVideo(winVid);
  });

  loseVid = createVideo(["lose.mov"], () => {
    setupMobileVideo(loseVid);
  });

  // Apply mobile attributes & hide default HTML video players immediately
  setupMobileVideo(introVid);
  setupMobileVideo(winVid);
  setupMobileVideo(loseVid);

  // Enable sensors immediately for non-iOS devices (Android)
  if (typeof DeviceOrientationEvent === "undefined" || typeof DeviceOrientationEvent.requestPermission !== "function") {
    startMotionListeners();
  }

  resetGame();

  imageMode(CENTER);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  noStroke();
}

function setupMobileVideo(vid) {
  if (!vid) return;
  vid.hide();
  vid.attribute("playsinline", "");
  vid.attribute("webkit-playsinline", "");
  vid.attribute("preload", "auto");
  vid.elt.muted = true;
}

function safePlay(vid) {
  if (!vid || !vid.elt) return;

  // If the video file failed to load or codec isn't supported, skip gracefully
  if (vid.elt.error) {
    console.warn("Video file error (check filename/codec):", vid.elt.error);
    if (state === 0) switchState(1);
    return;
  }

  // Only reset timestamp if video metadata has loaded
  if (vid.elt.readyState >= 1) {
    vid.elt.currentTime = 0;
  }

  let playPromise = vid.elt.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        vid.elt.muted = false;
      })
      .catch(() => {
        // Fallback to muted playback if browser blocks audio
        vid.elt.muted = true;
        vid.elt.play().catch(() => {
          if (state === 0) switchState(1);
        });
      });
  }
}

function safeStop(vid) {
  if (!vid || !vid.elt) return;
  vid.elt.pause();
  if (vid.elt.readyState >= 1) {
    vid.elt.currentTime = 0;
  }
}

function draw() {
  switch (state) {
    case 0: // --- INTRO CUTSCENE ---
      background(0);
      image(introVid, width / 2, height / 2, width, height);

      fill(255);
      textSize(20);
      text("Tap screen to start / skip", width / 2, height - 40);
      break;

    case 1: // --- MAIN GAMEPLAY ---
      playGame();
      break;

    case 2: // --- WIN VIDEO ---
      background(0);
      image(winVid, width / 2, height / 2, width, height);
      fill(255);
      textSize(20);
      text("Tap to play again", width / 2, height - 40);
      break;

    case 3: // --- LOSE VIDEO ---
      background(0);
      image(loseVid, width / 2, height / 2, width, height);
      fill(255);
      textSize(20);
      text("Tap to try again", width / 2, height - 40);
      break;
  }
}

function playGame() {
  if (bgImage) {
    image(bgImage, width / 2, height / 2, width, height);
  } else {
    background(100);
  }

  // Use phone tilt sensors if active, otherwise fall back to touch/drag
  if (motionEnabled && (tiltgamma !== 0 || tiltbeta !== 0)) {
    xPosition = constrain(map(tiltgamma, -18, 18, 0, width), 0, width);
    yPosition = constrain(map(tiltbeta, 25, 45, 0, height), 0, height);
  } else if (mouseIsPressed || touches.length > 0) {
    xPosition = constrain(mouseX, 0, width);
    yPosition = constrain(mouseY, 0, height);
  }

  push();
  translate(xPosition, yPosition);
  image(frogImage, 0, 0, 100, 100);
  pop();

  frogPos.x = xPosition;
  frogPos.y = yPosition;

  // Loop backwards when splicing so items aren't skipped
  for (var i = cars.length - 1; i >= 0; i--) {
    cars[i].display();
    cars[i].drive();
    if (cars[i].pos.dist(frogPos) < 50) {
      cars.splice(i, 1);
    }
  }

  // Countdown Timer UI
  if (frameCount % 60 === 0 && timer > 0) {
    timer--;
  }
  fill(255);
  textSize(24);
  text("Time: " + timer + " | Blades left: " + cars.length, width / 2, 40);

  // Check Win / Lose Conditions
  if (cars.length === 0) {
    switchState(2); // Win!
  } else if (timer <= 0) {
    switchState(3); // Lose!
  }
}

function switchState(newState) {
  state = newState;
  safeStop(introVid);
  safeStop(winVid);
  safeStop(loseVid);

  if (state === 0) {
    safePlay(introVid);
  } else if (state === 1) {
    resetGame();
  } else if (state === 2) {
    safePlay(winVid);
  } else if (state === 3) {
    safePlay(loseVid);
  }
}

function handleScreenTap() {
  // Prevent touchStarted + mousePressed from firing twice on a single tap
  if (millis() - lastTapTime < 300) return;
  lastTapTime = millis();

  // Request iOS 13+ motion permissions on user gesture
  if (
    !motionEnabled &&
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((response) => {
        if (response === "granted") {
          startMotionListeners();
        }
      })
      .catch(console.error);
  }

  if (state === 0) {
    if (introVid.elt.paused) {
      safePlay(introVid);
    } else {
      switchState(1);
    }
  } else if (state === 2 || state === 3) {
    switchState(1);
  }
}

function touchStarted() {
  handleScreenTap();
  return false; // Prevents mobile browser scrolling and pull-to-refresh
}

function mousePressed() {
  handleScreenTap();
}

function resetGame() {
  timer = 15;
  xPosition = width / 2;
  yPosition = height / 2;
  cars = [];
  for (var i = 0; i < 40; i++) {
    cars.push(new Car());
  }
}

function deviceShaken() {
  if (state === 1) {
    resetGame();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function startMotionListeners() {
  if (motionEnabled) return;
  motionEnabled = true;

  window.addEventListener("deviceorientation", (e) => {
    if (e.alpha !== null) tiltalpha = e.alpha;
    if (e.beta !== null) tiltbeta = e.beta;
    if (e.gamma !== null) tiltgamma = e.gamma;
  });

  window.addEventListener("devicemotion", (e) => {
    if (e.acceleration) {
      accelX = e.acceleration.x || 0;
      accelY = e.acceleration.y || 0;
      accelZ = e.acceleration.z || 0;
    }
  });
}

class Car {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(random(-5, 5), random(-5, 5));
  }

  display() {
    image(flyImage, this.pos.x, this.pos.y, 100, 100);
  }

  drive() {
    this.pos.add(this.vel);
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }
}

