
let alpha = 0, beta = 0, gamma = 0;
let xPosition = 0, yPosition = 0;

let bladeImg, mowerImg, bgImg, enemyImg;
let introVid, winVid, loseVid;
let blades = [];
let mowerPos;
let chaser;

let state = 0; // 0 = Intro, 1 = Gameplay, 2 = Survived (Win Video), 3 = Lose
let permissionGranted = false;

let survivalGoal = 15; // Seconds needed to survive
let startTime = 0;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  mowerPos = createVector(width / 2, height - 80);

  // Load images (replace "enemy.png" with your own enemy sprite filename)
  bladeImg = await loadImage("blade.png");
  mowerImg = await loadImage("mower.png");
  bgImg = await loadImage("grass.jpeg");
  enemyImg = await loadImage("enemy.png");

  // Load videos and hide HTML players
  introVid = createVideo("intro.mov");
  introVid.hide();

  winVid = createVideo("win.mov");
  winVid.hide();

  loseVid = createVideo("lose.mov");
  loseVid.hide();

  resetRound();

  imageMode(CENTER);
  rectMode(CENTER);
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
    case 0: // INTRO SCREEN
      image(introVid, width / 2, height / 2, width, height);

      fill(0, 160);
      rect(width / 2, height - 80, width, 100);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("Survive for " + survivalGoal + "s! Tap to start", width / 2, height - 80);
      break;

    case 1: // MAIN GAMEPLAY (DODGE & OUTRUN)
      if (bgImg) {
        image(bgImg, width / 2, height / 2, width, height);
      }

      // Calculate remaining time
      let elapsedSeconds = (millis() - startTime) / 1000;
      let timeLeft = max(0, survivalGoal - elapsedSeconds);

      // Move player via tilt
      xPosition = map(gamma, -18, 18, 0, width, true);
      yPosition = map(beta, 25, 45, 0, height, true);

      image(mowerImg, xPosition, yPosition, 100, 100);
      mowerPos.set(xPosition, yPosition);

      // Update and check Enemy Chaser
      chaser.chase(mowerPos);
      chaser.display();

      if (chaser.pos.dist(mowerPos) < 50) {
        state = 3;
        loseVid.play();
        break;
      }

      // Update blades and check collision
      for (let i = 0; i < blades.length; i++) {
        blades[i].display();
        blades[i].drive();

        if (blades[i].pos.dist(mowerPos) < 50) {
          state = 3;
          loseVid.play();
          break;
        }
      }

      // Display countdown timer
      fill(0, 150);
      rect(width / 2, 40, 220, 50, 10);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(24);
      text("Survive: " + ceil(timeLeft) + "s", width / 2, 40);

      // Play win video if player survives the full duration
      if (timeLeft <= 0 && state === 1) {
        state = 2;
        winVid.play();
      }
      break;

    case 2: // SURVIVED LONG ENOUGH (WIN VIDEO)
      image(winVid, width / 2, height / 2, width, height);

      fill(0, 150);
      rect(width / 2, height - 60, width, 80);
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(22);
      text("You Survived! Tap to play again", width / 2, height - 60);
      break;

    case 3: // CAUGHT OR HIT (LOSE VIDEO)
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
  // Request iOS motion permission
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

    resetRound();
    startTime = millis();
    state = 1;
  }
}

function resetRound() {
  blades = [];
  for (let i = 0; i < 15; i++) {
    blades.push(new Blade());
  }
  chaser = new Enemy(width / 2, 80, 2.5); // Spawns at top center with speed 2.5
}

function startMotionListeners() {
  window.addEventListener("deviceorientation", (e) => {
    alpha = e.alpha || 0;
    beta = e.beta || 0;
    gamma = e.gamma || 0;
  });
}

class Enemy {
  constructor(x, y, speed) {
    this.pos = createVector(x, y);
    this.speed = speed;
  }

  chase(targetPos) {
    // Calculate vector pointing from enemy toward player
    let dir = p5.Vector.sub(targetPos, this.pos);
    dir.setMag(this.speed);
    this.pos.add(dir);
  }

  display() {
    if (enemyImg) {
      image(enemyImg, this.pos.x, this.pos.y, 110, 110);
    } else {
      // Fallback red circle if enemy.png is not loaded yet
      fill(220, 40, 40);
      ellipse(this.pos.x, this.pos.y, 80, 80);
    }
  }
}

class Blade {
  constructor() {
    this.pos = createVector(random(width), random(height * 0.6));
    this.vel = createVector(random(-5, 5), random(-5, 5));
  }

  display() {
    image(bladeImg, this.pos.x, this.pos.y, 100, 100);
  }

  drive() {
    this.pos.add(this.vel);
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = height;
  }
}
