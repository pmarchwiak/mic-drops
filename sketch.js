let mic;
let fft;
let osc;
// const binCount = 1024;
const binCount = 2048; // Adjusted for voice range
let sampleRate;
const minFreq = 60; // Lowest frequency we're interested in (Hz)
const maxFreq = 2000; // Highest frequency we're interested in (Hz)

const smoothing = 0.8;
let primaryFreq = 0;

let emitterSpeed = 10;
let emitter;
let circles = [];

// number of frames between each drop
let framesBetweenSound = 50;

// threshold for a sound to register
let volThreshold = 0.01;
// number of pixels to move per frame
let circleSpeed = 10; 

let lastFrameSound = 0;

let button;
let sensitivitySlider;
let circleSpeedSlider;
let micSpeedSlider;
let lifeSlider;
let liveForeverVal = 50;
let sliders;

let isStarted = false;
let isRunning = false;
let isInfoShowing = false;

function setup() {
  createCanvas(windowWidth - 10, windowHeight - 10);

  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(smoothing, binCount);
  fft.setInput(mic);
  
  emitter = new MicSprite(emitterSpeed);
  
  // button = createButton("start / stop");
  // // button.size(100, AUTO)
  // button.mouseClicked(startStop);
  // button.position(10, windowHeight / 2);
  
  sensitivitySlider = createSlider(1, 100, 70);
  sensitivitySlider.hide();
  // sensitivitySlider.size(100);
  sensitivitySlider.position(10, windowHeight - 250);
  // text("sensitivity", 10, windowHeight - 200);
  
  circleSpeedSlider = createSlider(1, 100, 50);
  circleSpeedSlider.hide();
  // circleSpeedSlider.size(100);
  circleSpeedSlider.position(10, windowHeight - 200);
  
  // control how fast the mic/emitter moves
  micSpeedSlider = createSlider(1, 10, 5);
  micSpeedSlider.hide();
  // micSpeedSlider.size(100);
  micSpeedSlider.position(10, windowHeight - 150);
  
  // control how big the circles are when created, and thus how long they live
  lifeSlider = createSlider(1, liveForeverVal, 30);
  lifeSlider.hide();
  // lifeSlider.size(100);
  lifeSlider.position(10, windowHeight - 100);
  
  sliders = [sensitivitySlider, circleSpeedSlider, micSpeedSlider, lifeSlider];
  
  console.log("finished setup");
}


function draw() {
  
  if (isStarted) {
    drawBackground();
  }
  
  let vol = mic.getLevel();
  // if (frameCount % 20 === 0) {
    // console.log(`frameCount: ${frameCount}, vol: ${vol}`)
  // }

  let enoughTimePassedSinceLastSound = (frameCount - lastFrameSound) > framesBetweenSound;
  
  let volThreshold = map(sensitivitySlider.value(), 1, 100, .01, .000001);
  let circleSpeed = map(circleSpeedSlider.value(), 1, 100, 1, 30);
  let maxLife = lifeSlider.value();
  
  let isSoundDetected = vol > volThreshold && enoughTimePassedSinceLastSound;
  // Create new circle if there's a significant sound
  if (isSoundDetected && isRunning) {
    let spectrum = fft.analyze();
    
    primaryFreq = findPrimaryFrequency(spectrum);
    let closestNote = Tonal.Note.fromFreq(primaryFreq);
    let freq = Tonal.Note.freq(closestNote);
    
    // let circleDiam = map(vol, 0, 0.03, 10, 30);
    let circleDiam = map(vol, volThreshold, volThreshold * 1.5, 10, maxLife, true);


    console.log(`New sound, primaryFreq: ${primaryFreq}, closestNote: ${closestNote}, updated freq: ${freq}, vol: ${vol}, size: ${circleDiam}`);
  
    if (freq >= minFreq && freq <= maxFreq) {
      let circleColor = frequencyToColor(freq);
      circles.push(new SoundCircle(emitter.x, emitter.height + (circleDiam/2), circleDiam, circleSpeed, circleColor, freq));
      lastFrameSound = frameCount;
    }
  }
  
  
  if (isRunning) {
    // Update and draw emitter
    emitter.setSpeed(micSpeedSlider.value());
    emitter.update();
    emitter.draw(isSoundDetected);


    // Update and draw circles
    for (let i = circles.length - 1; i >= 0; i--) {
      let c = circles[i];
      if (c.diam <= 0) {
        circles.splice(i, 1);
      }
      else {
        if (c.diam > maxLife) {
          c.diam = maxLife;
        }
        c.speed = circleSpeed;
        c.update(circles.length, maxLife === liveForeverVal);
        c.draw();
        // text(circles[i].freq, circles[i].x + 20, circles[i].y)
      }
    }

    // Display the primary frequency
    fill(0);
    
    textSize(16);
    textAlign(LEFT, TOP);
    text("we listen", 180, windowHeight - 250);
    text("we fall", 180, windowHeight - 200);
    text("we move", 180, windowHeight - 150);
    text("we live", 180, windowHeight - 100);
    
    
    if (isInfoShowing) {
      text(`freq: ${primaryFreq.toFixed(2)} Hz, vol: ${vol}, threshold: ${volThreshold}`, 10, height - 40);
    }
  }
}

// function findPrimaryFrequency(spectrum) {
//   let maxAmp = 0;
//   let maxIndex = 0;
  
//   for (let i = 0; i < spectrum.length; i++) {
//     if (spectrum[i] > maxAmp) {
//       maxAmp = spectrum[i];
//       maxIndex = i;
//     }
//   }
  
//   return map(maxIndex, 0, spectrum.length, 0, 22050);
// }

function startStop() {
  if (!isStarted) {
    userStartAudio();
    sampleRate = getAudioContext().sampleRate;
    console.log("Sample Rate:", sampleRate);
    isStarted = true;
    document.querySelector("h1").classList.add("fade-out");
    sliders.forEach((slider) => {
      slider.addClass("fade-in");
      slider.show();
    });
  }

  if (!isRunning) {
    isRunning = true;
  }
  else {
    isRunning = false;
    circles = [];
  }
}

// toggle the overlay when the info button is clicked
function toggleOverlay() {
  console.log(`isInfoShowing: ${isInfoShowing}`);
  if (!isInfoShowing) {
    document.querySelector("#overlay").style.display = "block";
  }
  else {
    document.querySelector("#overlay").style.display = "none";
  }
  isInfoShowing = !isInfoShowing;
}

// 
function closeOverlay(event) {
  if (event.target.nodeName.toLowerCase() !== "a") {
    toggleOverlay();
  }
}

let angle = 0;
function drawBackground() {
  // Update the angle
  angle += 0.02;
  
  // Calculate the gradient colors
  let c1 = color(150);  // Black
  let c2 = color(map(sin(angle), -1, 1, 150, 255));  // Varying grey
  
  // Create the gradient
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(c1, c2, inter);
    stroke(c);
    line(0, y, width, y);
  }
}

// function findPrimaryFrequency(spectrum) {
//   let maxAmp = 0;
//   let minIndex = Math.floor(minFreq / (sampleRate / 2) * spectrum.length);
//   let maxIndex = Math.ceil(maxFreq / (sampleRate / 2) * spectrum.length);
  
//   for (let i = minIndex; i < maxIndex; i++) {
//     if (spectrum[i] > maxAmp) {
//       maxAmp = spectrum[i];
//       maxIndex = i;
//     }
//   }
  
//   return map(maxIndex, 0, spectrum.length, 0, sampleRate / 2);
// }

function findPrimaryFrequency(spectrum) {
  let lowFreq = 85;
  let highFreq = 1100;
  let lowIndex = freqToIndex(lowFreq, spectrum.length);
  let highIndex = freqToIndex(highFreq, spectrum.length);
  console.log(`lowIndex: ${lowIndex}, highIndex: ${highIndex}`);

  let maxEnergy = 0;
  let primary = 0;
  for (let i = lowIndex; i <= highIndex; i++) {
    if (spectrum[i] > maxEnergy) {
      maxEnergy = spectrum[i];
      console.log(`new max: ${maxEnergy}`);
      primary = indexToFreq(i, spectrum.length);
    }
  }
  return primary;
}

// Utility function to convert frequency to FFT index
function freqToIndex(freq, spectrumLength) {
  let nyquist = sampleRate / 2;
  return Math.round((freq / nyquist) * spectrumLength);
}

// Utility function to convert FFT index to frequency
function indexToFreq(index, spectrumLength) {
  let nyquist = sampleRate / 2;
  return (index * nyquist) / spectrumLength;
}

function frequencyToColor(freq) {
  // Map frequency to hue (0-360)
  let hue = map(freq, 100, 1000, 0, 360);
  colorMode(HSB, 360, 100, 100);
  let col = color(hue, 100, 100);
  colorMode(RGB, 255); // Reset to default color mode
  return col;
}

class SoundCircle {
  constructor(x, y, diam, speed, col, freq) {
    this.x = x;
    this.y = y;
    this.diam = diam;
    this.speed = speed;
    this.col = col;
    this.freq = freq;
    this.osc = new p5.Oscillator('sine');
    this.isUp = true;
    //this.makeSound();
  }
  
  makeSound(numCircles) {
    this.osc.start();
    this.osc.freq(this.freq);
    let amp = 0.5 / numCircles;
    console.log(`amp is ${amp}`)
    this.osc.amp(0.5 / numCircles, 0.3);
    setTimeout(this.osc.amp(0, 0.4), 500);
  }

  update(numCircles, liveForever) {
    if (this.isUp) {
      this.y -= this.speed;
    }
    else {
      this.y += this.speed;
    }
    if (this.isAtTop() || this.isAtBottom()) {
      this.makeSound(numCircles);
      this.isUp = !this.isUp;
      if (!liveForever) {
        this.diam -= 2;
      }
    }
  }

  draw() {
    // noStroke();
    fill(this.col);
    ellipse(this.x, this.y, this.diam);
  }
  
  isAtTop() {
    return this.y - (this.diam/2) < 0;
  }
  
  isAtBottom() {
    return this.y + (this.diam/2) >= height;
  }
}

class MicSprite {
  constructor(speed) {
    this.x = 0;
    this.speed = speed;
    this.height = 20;
  }
  
  update() {
    this.x += this.speed;
    
    if (this.x >= windowWidth) {
      this.x = 0;
    }
  }
  
  draw(isMakingSound) {
    fill("black");
    rect(this.x, 0, 10, 30);
    fill("grey");
    
    const diam = isMakingSound ? 25 : 20;
    circle(this.x + 5, 30, diam);
  }
  
  setSpeed(speed) {
    this.speed = speed;
  }
}