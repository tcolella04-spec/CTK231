var tiltbeta = 0, tiltgamma = 0, tiltalpha = 0;
var accelX = 0, accelY = 0, accelZ = 0;
var xPosition = 0, yPosition = 0;

let flyImage, frogImage, bgImage;
let introVid, winVid, loseVid;

var cars = [];
var frogPos;

// Game State & Timer
let state = 0; // 0 = Intro Cutscene, 1 = Playing, 2 = Win, 3 = Lose
let roundDuration = 15; // Survive 15 seconds to win
let timer = roundDuration;
let gameStartTime = 0;

let motionEnabled = false;
let lastTapTime = 0;
let numEnemies = 5; // Number of chasing blades

async function setup() {
  createCanvas(windowWidth, windowHeight);

  frogPos = createVector(width / 2, height / 2);

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

  if (vid.elt.error) {
    console.warn("Video file error (check filename/codec):", vid.elt.error);
    if (state === 0) switchState(1);
    return;
  }

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

  // Update and draw chasing blades
  for (var i = 0; i < cars.length; i++) {
    cars[i].display();
    cars[i].chase(frogPos);

    // Touching a blade triggers Lose video (state 3)
    if (cars[i].pos.dist(frogPos) < 55) {
      switchState(3);
      return;
    }
  }

  // Accurate real-time countdown in seconds
  let elapsed = floor((millis() - gameStartTime) / 1000);
  timer = max(0, roundDuration - elapsed);

  fill(255);
  textSize(28);
  text("Survive: " + timer + "s", width / 2, 40);

  // Timer reaches 0 -> Win video (state 2)
  if (timer === 0) {
    switchState(2);
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
  if (millis() - lastTapTime < 300) return;
  lastTapTime = millis();

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
  return false;
}

function mousePressed() {
  handleScreenTap();
}

function resetGame() {
  timer = roundDuration;
  gameStartTime = millis();
  xPosition = width / 2;
  yPosition = height / 2;
  frogPos.set(xPosition, yPosition);

  cars = [];
  for (var i = 0; i < numEnemies; i++) {
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
    // Spawn along the outer edges so enemies don't immediately hit the player in the center
    if (random(1) < 0.5) {
      this.pos = createVector(random(width), random(1) < 0.5 ? 0 : height);
    } else {
      this.pos = createVector(random(1) < 0.5 ? 0 : width, random(height));
    }

    // Give each chaser a slightly different speed so they don't stack into a single blob
    this.speed = random(2, 4.5);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(frameCount * 0.15);
    image(flyImage, 0, 0, 90, 90);
    pop();
  }

  chase(target) {
    let direction = p5.Vector.sub(target, this.pos);
    direction.normalize();
    direction.mult(this.speed);

    this.pos.add(direction);
  }
}


