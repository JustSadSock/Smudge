import { hexToRGBA } from './utils.js';
import { renderFrameRailHTML } from './renderRail.js';

window.addEventListener('contextmenu', e => e.preventDefault());

const layers = [
  document.getElementById('layer0'),
  document.getElementById('layer1')
];
const ctxs = layers.map(l => l.getContext('2d'));
let activeLayer = 1;
let canvas = layers[activeLayer];
let ctx = ctxs[activeLayer];

const colorPicker = document.getElementById('colorPicker');
const opacityPicker = document.getElementById('opacityPicker');
const sizePicker = document.getElementById('sizePicker');
const brushShape = document.getElementById('brushShape');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const addFrameBtn = document.getElementById('addFrameBtn');
const playBtn = document.getElementById('playBtn');
const exportBtn = document.getElementById('exportBtn');
const onionRange = document.getElementById('onionRange');
const frameRail = document.getElementById('frameRail');
const container = document.getElementById('canvasContainer');

const onionCanvas = document.createElement('canvas');
const onionCtx = onionCanvas.getContext('2d');
container.insertBefore(onionCanvas, layers[0]);

let frames = [];
let currentFrame = 0;
let drawing = false;

function resizeCanvas() {
  layers.forEach(l => {
    l.width = window.innerWidth;
    l.height = container.offsetHeight;
  });
  onionCanvas.width = layers[0].width;
  onionCanvas.height = layers[0].height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function renderFrameRail() {
  frameRail.innerHTML = renderFrameRailHTML(frames, currentFrame);
}

function captureCurrent() {
  const off = document.createElement('canvas');
  off.width = layers[0].width;
  off.height = layers[0].height;
  const offCtx = off.getContext('2d');
  layers.forEach(l => offCtx.drawImage(l,0,0));
  return off.toDataURL();
}

function saveFrame() {
  frames[currentFrame] = captureCurrent();
  renderFrameRail();
}

function loadFrame(i) {
  currentFrame = i;
  ctxs.forEach(c => c.clearRect(0,0,c.canvas.width,c.canvas.height));
  if (frames[i]) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img,0,0);
    img.src = frames[i];
  }
  renderFrameRail();
  showOnion();
}

function addFrame(copy=false) {
  saveFrame();
  const data = copy ? frames[currentFrame] : null;
  frames.splice(currentFrame+1,0,data);
  loadFrame(currentFrame+1);
}

addFrameBtn.addEventListener('click', () => addFrame(true));

frameRail.addEventListener('click', e => {
  const idx = e.target.dataset.idx;
  if (idx) loadFrame(parseInt(idx,10));
});

function pointerDown(e) {
  drawing = true;
  ctx.strokeStyle = colorPicker.value;
  ctx.globalAlpha = opacityPicker.value/100;
  ctx.lineWidth = sizePicker.value;
  ctx.lineCap = brushShape.value === 'square' ? 'butt' : 'round';
  if (brushShape.value === 'eraser') ctx.globalCompositeOperation = 'destination-out';
  else ctx.globalCompositeOperation = 'source-over';
  const r = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
}

function pointerMove(e) {
  if (!drawing) return;
  const r = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
  ctx.stroke();
}

function pointerUp() {
  if (!drawing) return;
  drawing = false;
  ctx.closePath();
  ctx.globalCompositeOperation = 'source-over';
  saveFrame();
}

layers.forEach(l => {
  l.addEventListener('pointerdown', pointerDown);
  l.addEventListener('pointermove', pointerMove);
  l.addEventListener('pointerup', pointerUp);
  l.addEventListener('pointercancel', pointerUp);
  l.addEventListener('pointerout', pointerUp);
});

clearBtn.addEventListener('click', () => {
  ctxs.forEach(c => c.clearRect(0,0,c.canvas.width,c.canvas.height));
  saveFrame();
});

function showOnion() {
  onionCtx.clearRect(0,0,onionCanvas.width,onionCanvas.height);
  const prev = frames[currentFrame-1];
  if (prev) {
    const img = new Image();
    img.onload = () => {
      onionCtx.globalAlpha = onionRange.value/100;
      onionCtx.drawImage(img,0,0);
      onionCtx.fillStyle = 'rgba(128,0,128,0.5)';
      onionCtx.globalCompositeOperation = 'source-atop';
      onionCtx.fillRect(0,0,onionCanvas.width,onionCanvas.height);
      onionCtx.globalCompositeOperation = 'source-over';
    };
    img.src = prev;
  }
}

onionRange.addEventListener('input', showOnion);

function play() {
  let i = 0;
  const interval = setInterval(() => {
    loadFrame(i);
    i++;
    if (i >= frames.length) clearInterval(interval);
  }, 200);
}
playBtn.addEventListener('click', play);

function exportGIF() {
  saveFrame();
  const gif = new GIF({workers:2,quality:10});
  frames.forEach(data => {
    if (!data) return;
    const img = document.createElement('img');
    img.src = data;
    gif.addFrame(img, {delay:200});
  });
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation.gif';
    a.click();
  });
  gif.render();
}
exportBtn.addEventListener('click', exportGIF);

addFrame(false);
