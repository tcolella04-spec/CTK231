var tiltbeta = 0, tiltgamma = 0, tiltalpha = 0;
var accelX = 0, accelY = 0, accelZ = 0;
var xPosition = 0, yPosition = 0;

let flyImage, frogImage, bgImage, Player, Static;
let introVid, winVid, loseVid;

var cars = [];
var frogPos;

let state = 0;
let roundDuration = 15; 
let timer = roundDuration;
let gameStartTime = 0;

let motionEnabled = false;
let userInteracted = false;
let lastTapTime = 0;
let numEnemies = 2; // Number of chasing blades

async function setup() {
  createCanvas(windowWidth, windowHeight);

  frogPos = createVector(width / 2, height / 2);

  // Load Images (p5.js 2.0 async/await)
  flyImage = await loadImage("enemy.gif");
  frogImage = await loadImage("beginning.png");
  bgImage = await loadImage("forest2.png");
  player = await loadImage("sprite2.png");
  Static = await loadImage("static.gif");

  // Load Videos (Tries .mp4 first, falls back to .mov automatically)
  introVid = createVideo(["cutscene.mp4", "cutscene.mov"], () => {
    setupMobileVideo(introVid);
    if (state === 1) safePlay(introVid);
  });
  introVid.onended(() => switchState(2));

  winVid = createVideo(["win.mp4", "win.mov"], () => {
    setupMobileVideo(winVid);
  });

  loseVid = createVideo(["lose.mp4", "lose.mov"], () => {
    setupMobileVideo(loseVid);
  });

  setupMobileVideo(introVid);
  setupMobileVideo(winVid);
  setupMobileVideo(loseVid);

  if (
    typeof DeviceOrientationEvent === "undefined" ||
    typeof DeviceOrientationEvent.requestPermission !== "function"
  ) {
    startMotionListeners();
  }

  resetGame();

  imageMode(CENTER);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  noStroke();
}

function setupMobileVideo(vid) {
  if (!vid || !vid.elt) return;
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
    if (state === 1) switchState(2);
    return;
  }

  if (vid.elt.readyState >= 1) {
    vid.elt.currentTime = 0;
  }

  vid.elt.muted = !userInteracted;

  let playPromise = vid.elt.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      vid.elt.muted = true;
      vid.elt.play().catch((err) => {
        console.warn("Video play blocked until tap:", err);
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

function drawMediaCover(media, mediaW, mediaH) {
  if (!media || !mediaW || !mediaH) return;
  let canvasRatio = width / height;
  let mediaRatio = mediaW / mediaH;
  let drawW, drawH;

  if (canvasRatio > mediaRatio) {
    drawW = width;
    drawH = width / mediaRatio;
  } else {
    drawH = height;
    drawW = height * mediaRatio;
  }
  image(media, width / 2, height / 2, drawW, drawH);
}

function draw() {
  switch (state) {
    case 0: // --- TITLE SCREEN ---
      drawTitleScreen();
      break;

    case 1: // --- INTRO CUTSCENE ---
      background(0);
      if (introVid && introVid.elt.readyState >= 2) {
        drawMediaCover(introVid, introVid.elt.videoWidth, introVid.elt.videoHeight);
      }
      fill(255);
      textSize(20);
      text("Tap screen to skip", width / 2, height - 40);
      break;

    case 2: // --- MAIN GAMEPLAY ---
      playGame();
      break;

    case 3: // --- WIN VIDEO ---
      background(0);
      if (winVid && winVid.elt.readyState >= 2) {
        drawMediaCover(winVid, winVid.elt.videoWidth, winVid.elt.videoHeight);
      }
      fill(255);
      textSize(20);
      text("Tap to return to title", width / 2, height - 40);
      break;

    case 4: // --- LOSE VIDEO ---
      background(0);
      if (loseVid && loseVid.elt.readyState >= 2) {
        drawMediaCover(loseVid, loseVid.elt.videoWidth, loseVid.elt.videoHeight);
      }
      fill(255);
      textSize(20);
      text("Tap to return to title", width / 2, height - 40);
      break;
  }
}

function drawTitleScreen() {
  if (bgImage) {
    drawMediaCover(bgImage, bgImage.width, bgImage.height);
    
    fill(0, 120);
    rect(width / 2, height / 2, width, height);
  } else {
    background(30, 80, 30);
  }

  fill(255);
  textSize(44);
  text("Mr Dubby's Walk in the Woods", width / 2, height * 0.32);

  if (frogImage) {
    image(frogImage, width / 2, height * 0.5, 120, 140);
  }

  textSize(24);
  text("Tap to Start", width / 2, height * 0.8);
}

function playGame() {
  if (bgImage) {
    drawMediaCover(bgImage, bgImage.width, bgImage.height);
  } else {
    background(100);
  }

  if (Static) {
    push();
    tint(255, 80);
    drawMediaCover(Static, Static.width, Static.height);
    pop();
  }
  if (touches.length > 0) {
    xPosition = constrain(touches[0].x, 0, width);
    yPosition = constrain(touches[0].y, 0, height);
  } else if (mouseIsPressed) {
    xPosition = constrain(mouseX, 0, width);
    yPosition = constrain(mouseY, 0, height);
  } else if (motionEnabled && (tiltgamma !== 0 || tiltbeta !== 0)) {
    xPosition = constrain(map(tiltgamma, -18, 18, 0, width), 0, width);
    yPosition = constrain(map(tiltbeta, 25, 45, 0, height), 0, height);
  }

  push();
  translate(xPosition, yPosition);
  if (player) {
    image(player, 0, 0, 60, 80);
  }
  pop();

  frogPos.x = xPosition;
  frogPos.y = yPosition;

  // Update and draw chasing blades
  for (var i = 0; i < cars.length; i++) {
    cars[i].display();
    cars[i].chase(frogPos);

    // Touching a blade triggers Lose video (state 4)
    if (cars[i].pos.dist(frogPos) < 55) {
      switchState(4);
      return;
    }
  }

  // Accurate real-time countdown in seconds
  let elapsed = floor((millis() - gameStartTime) / 1000);
  timer = max(0, roundDuration - elapsed);

  fill(255);
  textSize(28);
  text("Survive: " + timer + "s", width / 2, 40);

  // Timer reaches 0 -> Win video (state 3)
  if (timer === 0) {
    switchState(3);
  }
}

function switchState(newState) {
  state = newState;
  safeStop(introVid);
  safeStop(winVid);
  safeStop(loseVid);

  if (state === 1) {
    safePlay(introVid);
  } else if (state === 2) {
    resetGame();
  } else if (state === 3) {
    safePlay(winVid);
  } else if (state === 4) {
    safePlay(loseVid);
  }
}

function handleScreenTap() {
  if (millis() - lastTapTime < 300) return;
  lastTapTime = millis();
  userInteracted = true;

  // Unlock iOS orientation & motion sensors on tap
  if (!motionEnabled) {
    if (
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
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      DeviceMotionEvent.requestPermission().catch(console.error);
    }
  }

  if (state === 0) {
    // Title screen -> Start Intro Cutscene (with sound unlocked!)
    switchState(1);
  } else if (state === 1) {
    // Intro Cutscene -> Skip straight to Gameplay
    switchState(2);
  } else if (state === 3 || state === 4) {
    // Win or Lose -> Back to Title Screen
    switchState(0);
  }
}

function touchStarted() {
  handleScreenTap();
  return false;
}

function mousePressed() {
  if (touches.length > 0) return;
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
    cars.push(new Car(i % 2 === 1));
  }
}

function deviceShaken() {
  if (state === 2) {
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
  constructor(isFlipped = false) {
    this.isFlipped = isFlipped
    if (random(1) < 0.5) {
      this.pos = createVector(random(width), random(1) < 0.5 ? 0 : height);
    } else {
      this.pos = createVector(random(1) < 0.5 ? 0 : width, random(height));
    }
    this.speed = random(2, 4.5);
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    if (this.isFlipped) {
      scale(-1,1);
    }
    if (flyImage) {
      image(flyImage, 0, 0, 90, 90);
    }
    pop();
  }

  chase(target) {
    let direction = p5.Vector.sub(target, this.pos);
    direction.normalize();
    direction.mult(this.speed);
    this.pos.add(direction);
  }
}


