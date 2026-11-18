var beta = 35, gamma = 0;
let xPosition = 0, yPosition = 0;

let introVid, winVid, loseVid;
let blades = [];
let mowerPos;
let chaser;

let state = 0;
let permissionGranted = false;
let survivalGoal = 15;
let startTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  mowerPos = createVector(width / 2, height - 80);

  introVid = createVideo("intro.mp4");
  introVid.attribute("playsinline", "");
  introVid.volume(0); 
  introVid.loop();
  introVid.hide();

  winVid = createVideo("win.mp4");
  winVid.attribute("playsinline", "");
  winVid.hide();

  loseVid = createVideo("lose.mp4");
  loseVid.attribute("playsinline", "");
  loseVid.hide();

  resetRound();

  rectMode(CENTER);
  imageMode(CENTER);
  noStroke();

  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    permissionGranted = false;
  } else {
    permissionGranted = true;
    startMotionListeners();
  }
}

function draw() {
  background(0);

  switch (state) {
    case 0:
      image(introVid, width / 2, height / 2, width, height);

      fill(0, 160);
      rect(width / 2, height - 80, width, 100);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("Survive for " + survivalGoal + "s! Tap to start", width / 2, height - 80);
      break;

    case 1:
      background(55, 140, 65);

      let elapsedSeconds = (millis() - startTime) / 1000;
      let timeLeft = max(0, survivalGoal - elapsedSeconds);

      handleDesktopFallback();
      xPosition = map(gamma, -18, 18, 0, width, true);
      yPosition = map(beta, 25, 45, 0, height, true);

      fill(40, 140, 255);
      ellipse(xPosition, yPosition, 70, 70);
      mowerPos.set(xPosition, yPosition);

      chaser.chase(mowerPos);
      chaser.display();

      if (chaser.pos.dist(mowerPos) < 50) {
        state = 3;
        loseVid.play();
        break;
      }
      
      for (let i = 0; i < blades.length; i++) {
        blades[i].display();
        blades[i].drive();

        if (blades[i].pos.dist(mowerPos) < 50) {
          state = 3;
          loseVid.play();
          break;
        }
      }

      fill(0, 150);
      rect(width / 2, 40, 220, 50, 10);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(24);
      text("Survive: " + ceil(timeLeft) + "s", width / 2, 40);

      if (timeLeft <= 0 && state === 1) {
        state = 2;
        winVid.play();
      }
      break;

    case 2:
      image(winVid, width / 2, height / 2, width, height);

      fill(0, 150);
      rect(width / 2, height - 60, width, 80);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("You Survived! Tap to play again", width / 2, height - 60);
      break;

    case 3:
      image(loseVid, width / 2, height / 2, width, height);

      fill(0, 150);
      rect(width / 2, height - 60, width, 80);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("You got caught! Tap to try again", width / 2, height - 60);
      break;
  }
}

function touchStarted() {
  if (!permissionGranted && typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then((response) => {
        if (response === "granted") {
          permissionGranted = true;
          startMotionListeners();
        }
      })
      .catch(console.error);
  }

  // Start or restart game
  if (state === 0 || state === 2 || state === 3) {
    introVid.stop();
    winVid.stop();
    loseVid.stop();

    winVid.play();
    winVid.pause();
    winVid.time(0);

    loseVid.play();
    loseVid.pause();
    loseVid.time(0);

    resetRound();
    startTime = millis();
    state = 1;
  }

  return false; 
}

function windowResized() {
  resizeCanvas(windowWidth,windowHeight);
}

function resetRound() {
  beta = 35;
  gamma = 0;
  mowerPos.set(width / 2, height - 80);

  blades = [];
  for (let i = 0; i < 15; i++) {
    blades.push(new Blade());
  }
  chaser = new Enemy(width / 2, 80, 2.5);
}

function startMotionListeners() {
  window.addEventListener("deviceorientation", (e) => {
    alpha = e.alpha || 0;
    beta = e.beta || 35;
    gamma = e.gamma || 0;
  });
}

function handleDesktopFallback() {
  if (keyIsDown(LEFT_ARROW)) gamma = constrain(gamma - 1, -18, 18);
  if (keyIsDown(RIGHT_ARROW)) gamma = constrain(gamma + 1, -18, 18);
  if (keyIsDown(UP_ARROW)) beta = constrain(beta - 0.8, 25, 45);
  if (keyIsDown(DOWN_ARROW)) beta = constrain(beta + 0.8, 25, 45);
}

class Enemy {
  constructor(x, y, speed) {
    this.pos = createVector(x, y);
    this.speed = speed;
  }

  chase(targetPos) {
    let dir = p5.Vector.sub(targetPos, this.pos);
    dir.setMag(this.speed);
    this.pos.add(dir);
  }

  display() {
    fill(220, 40, 40);
    ellipse(this.pos.x, this.pos.y, 80, 80);
  }
}

class Blade {
  constructor() {
    do {
      this.pos = createVector(random(width), random(height * 0.6));
    } while (this.pos.dist(mowerPos) < 180);

    this.vel = createVector(random(-5, 5), random(-5, 5));
  }

  display() {
    fill(245, 210, 40);
    rect(this.pos.x, this.pos.y, 50, 50, 8);
  }

  drive() {
    this.pos.add(this.vel);
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }
}

