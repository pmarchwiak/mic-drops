let mic;
let fft;
let osc;
// const binCount = 1024;
const binCount = 2048; // Adjusted for voice range
let sampleRate;
const minFreq = 80; // Lowest frequency we're interested in (Hz)
const maxFreq = 3000; // Highest frequency we're interested in (Hz)

const smoothing = 0.8;
let primaryFreq = 0;

let emitterSpeed = 10;
let emitter;
let circles = [];

// number of frames between each drop
let framesBetweenSound = 40;

// threshold for a sound to register
let volThreshold = 0.0001;
// number of pixels to move per frame
let circleSpeed = 10; 

let lastFrameSound = 0;

let button;
let isStarted = false;

function setup() {
  createCanvas(windowWidth, windowHeight);

  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(smoothing, binCount);
  fft.setInput(mic);

  // osc = new p5.Oscillator('sine');
  // osc.start();
  // osc.amp(0.5);
  
  emitter = new MicSprite(emitterSpeed);
  
  button = createButton("start / stop");
  button.mouseClicked(startStop);
  button.position(10, windowHeight / 2);
  
  console.log("finished setup");
}


function draw() {

  // osc.freq(primaryFreq);
  
  background('white');
  
  let vol = mic.getLevel();
  if (frameCount % 20 === 0) {
    // console.log(`frameCount: ${frameCount}, vol: ${vol}`)
  }

  let enoughTimePassedSinceLastSound = (frameCount - lastFrameSound) > framesBetweenSound || lastFrameSound === 0;
  
  let isSoundDetected = vol > volThreshold && enoughTimePassedSinceLastSound;
  // Create new circle if there's a significant sound
  if (isSoundDetected && isStarted) {
    let spectrum = fft.analyze();
    
    primaryFreq = findPrimaryFrequency(spectrum);
    let closestNote = Tonal.Note.fromFreq(primaryFreq);
    let freq = Tonal.Note.freq(closestNote);
    console.log(`New sound, primaryFreq: ${primaryFreq}, closestNote: ${closestNote}, updated freq: ${freq}`);
    
    let circleSize = map(vol, 0, 0.03, 10, 30);
    // let circleSpeed = map(vol, 0, 0.003, 1, 2);
    let circleColor = frequencyToColor(freq);
    circles.push(new SoundCircle(emitter.x, emitter.height + circleSize, circleSize, circleSpeed, circleColor, freq));
    lastFrameSound = frameCount;
  }
  
  
  if (isStarted) {
    // Update and draw emitter
    emitter.update();
    emitter.draw(isSoundDetected);


    // Update and draw circles
    for (let i = circles.length - 1; i >= 0; i--) {
      if (circles[i].size <= 0) {
        circles.splice(i, 1);
      }
      else {
        circles[i].update(circles.length);
        circles[i].draw();
        text(circles[i].freq, circles[i].x + 20, circles[i].y)
      }
    }

    // Display the primary frequency
    fill(0);
    textAlign(LEFT, TOP);
    textSize(16);
    text(`freq: ${primaryFreq.toFixed(2)} Hz, vol: ${vol}`, 10, height - 40);
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
  }
  else {
    isStarted = false;
    circles = [];
  }
}

function findPrimaryFrequency(spectrum) {
  let maxAmp = 0;
  let minIndex = Math.floor(minFreq / (sampleRate / 2) * spectrum.length);
  let maxIndex = Math.ceil(maxFreq / (sampleRate / 2) * spectrum.length);
  
  for (let i = minIndex; i < maxIndex; i++) {
    if (spectrum[i] > maxAmp) {
      maxAmp = spectrum[i];
      maxIndex = i;
    }
  }
  
  return map(maxIndex, 0, spectrum.length, 0, sampleRate / 2);
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
  constructor(x, y, size, speed, col, freq) {
    this.x = x;
    this.y = y;
    this.size = size;
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

  update(numCircles) {
    if (this.isUp) {
      this.y -= this.speed;
    }
    else {
      this.y += this.speed;
    }
    if (this.isAtTop() || this.isAtBottom()) {
      this.makeSound(numCircles);
      this.isUp = !this.isUp;
      this.size -= 2;
    }
  }

  draw() {
    // noStroke();
    fill(this.col);
    ellipse(this.x, this.y, this.size);
  }

  isOffScreen() {
    return this.y + this.size < 0;
  }
  
  isAtTop() {
    return this.y - this.size < 0;
  }
  
  isAtBottom() {
    return this.y + this.size >= height;
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
}