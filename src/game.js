import { hexToRGBA, distance, angle } from './utils.js';

window.addEventListener('contextmenu', e => e.preventDefault());

const toolbar = document.getElementById('toolbar');
const layers = [
  document.getElementById('layer0'),
  document.getElementById('layer1')
];
const ctxs = layers.map(l => l.getContext('2d'));
let activeLayer = 1;
let canvas = layers[activeLayer];
let ctx    = ctxs[activeLayer];

const colorPicker   = document.getElementById('colorPicker');
const opacityPicker = document.getElementById('opacityPicker');
const sizePicker    = document.getElementById('sizePicker');
const brushShape    = document.getElementById('brushShape');
const zoomInBtn     = document.getElementById('zoomInBtn');
const zoomOutBtn    = document.getElementById('zoomOutBtn');
const undoBtn       = document.getElementById('undoBtn');
const redoBtn       = document.getElementById('redoBtn');
const fillBtn       = document.getElementById('fillBtn');
const eyedropperBtn = document.getElementById('eyedropperBtn');
const clearBtn      = document.getElementById('clearBtn');
const saveBtn       = document.getElementById('saveBtn');
const ambientBtn    = document.getElementById('ambientBtn');
const gridBtn       = document.getElementById('gridBtn');
const gridOverlay   = document.getElementById('gridOverlay');
const quickPalette  = document.getElementById('quickPalette');
const layerSelect   = document.getElementById('layerSelect');
const showLayer0    = document.getElementById('showLayer0');
const showLayer1    = document.getElementById('showLayer1');
const moreBtn       = document.getElementById('moreBtn');

const paletteColors = ['#aed9e0','#f6c6c6','#d5e3dc','#e3daf5','#fefaf6','#e8e4df','#f3f3f3','#ffffff'];
quickPalette.innerHTML = paletteColors.map(c => `<div class="swatch" data-color="${c}" style="background:${c}"></div>`).join('');
quickPalette.addEventListener('click', e => {
  if (e.target.classList.contains('swatch')) {
    colorPicker.value = e.target.dataset.color;
    quickPalette.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
    e.target.classList.add('selected');
  }
});
let paletteTimer;
quickPalette.addEventListener('pointerdown', e => {
  if (e.target.classList.contains('swatch')) {
    paletteTimer = setTimeout(() => {
      e.target.dataset.color = colorPicker.value;
      e.target.style.background = colorPicker.value;
    }, 600);
  }
});
['pointerup','pointercancel','pointerout'].forEach(ev => {
  quickPalette.addEventListener(ev, () => clearTimeout(paletteTimer));
});

function updateVisibility() {
  layers[0].style.display = showLayer0.checked ? 'block' : 'none';
  layers[1].style.display = showLayer1.checked ? 'block' : 'none';
}
showLayer0.addEventListener('change', updateVisibility);
showLayer1.addEventListener('change', updateVisibility);
layerSelect.addEventListener('change', () => {
  activeLayer = parseInt(layerSelect.value, 10);
  canvas = layers[activeLayer];
  ctx = ctxs[activeLayer];
});
updateVisibility();

let currentTool = 'brush';
const history = [[], []];
const redoStack = [[], []];

let scale = 1;
let rotation = 0;
let offsetX = 0;
let offsetY = 0;
let startAngle = 0;
let startRotation = 0;
let startCentroid = {x:0,y:0};
let startOffsetX = 0;
let startOffsetY = 0;

let drawing = false;
const pointers = new Map();
let pinching = false;
let startDistance = 0;
let startScale = 1;
let swipeGesture = null;
const timelapseFrames = [];
let toolbarTimer;

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / scale,
    y: (e.clientY - rect.top) / scale
  };
}

function autosave() {
  layers.forEach((l, i) => {
    try { localStorage.setItem('layer'+i, l.toDataURL()); } catch(e) {}
  });
}

function captureFrame() {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const offCtx = off.getContext('2d');
  layers.forEach(l => offCtx.drawImage(l, 0, 0));
  timelapseFrames.push(off);
  if (timelapseFrames.length > 200) timelapseFrames.shift();
}

function checkStorage() {
  try {
    const size = (localStorage.getItem('layer0')||'').length + (localStorage.getItem('layer1')||'').length;
    if (size > 1024 * 1024) localStorage.clear();
  } catch(e) {}
}

function saveState() {
  const h = history[activeLayer];
  h.push(canvas.toDataURL());
  if (h.length > 50) h.shift();
  redoStack[activeLayer].length = 0;
  captureFrame();
  autosave();
}

function restoreState(data) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = data;
}

function resizeCanvas() {
  layers.forEach(layer => {
    layer.width  = window.innerWidth;
    layer.height = window.innerHeight - toolbar.offsetHeight;
    layer.style.top = '0';
  });
  gridOverlay.style.width = layers[0].width + 'px';
  gridOverlay.style.height = layers[0].height + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
checkStorage();
layers.forEach((layer, i) => {
  const data = localStorage.getItem('layer'+i);
  if (data) {
    const img = new Image();
    img.onload = () => ctxs[i].drawImage(img, 0, 0);
    img.src = data;
  }
});
saveState();

ctx.lineCap   = 'round';
ctx.lineJoin  = 'round';

let lastPoint = null;
let lastTime = 0;

function startDrawing(e) {
  drawing = true;
  ctx.strokeStyle = colorPicker.value;
  ctx.globalAlpha = opacityPicker.value / 100;
  ctx.lineWidth   = sizePicker.value;
  if (brushShape.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }
  if (brushShape.value === 'square') {
    ctx.lineCap = ctx.lineJoin = 'butt';
  } else {
    ctx.lineCap = ctx.lineJoin = 'round';
  }
  ctx.beginPath();
  const pos = getCanvasCoords(e);
  ctx.moveTo(pos.x, pos.y);
  lastPoint = pos;
  lastTime = performance.now();
  canvas.setPointerCapture(e.pointerId);
}

function pointerDown(e) {
  pointers.set(e.pointerId, {x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY});
  if (pointers.size === 2) {
    swipeGesture = {
      ids: Array.from(pointers.keys()),
      start: Array.from(pointers.values()).map(p => ({x:p.x, y:p.y}))
    };
    pinching = true;
    const [p1, p2] = Array.from(pointers.values());
    startDistance = distance(p1, p2);
    startScale = scale;
    startAngle = angle(p1, p2);
    startRotation = rotation;
    startCentroid = { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 };
    startOffsetX = offsetX;
    startOffsetY = offsetY;
    if (drawing) {
      drawing = false;
      ctx.closePath();
    }
    return;
  }
  if (pointers.size > 1 || pinching) return;

  if (e.currentTarget !== canvas) {
    pointers.delete(e.pointerId);
    return;
  }

  if (currentTool === 'eyedropper') {
    const pos = getCanvasCoords(e);
    const data = ctx.getImageData(pos.x, pos.y, 1, 1).data;
    const hex = '#' + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    colorPicker.value = hex;
    opacityPicker.value = Math.round(data[3] / 255 * 100);
    currentTool = 'brush';
    pointers.delete(e.pointerId);
    return;
  }

  startDrawing(e);
}

function pointerMove(e) {
  if (pointers.has(e.pointerId)) {
    const p = pointers.get(e.pointerId);
    p.x = e.clientX;
    p.y = e.clientY;
    pointers.set(e.pointerId, p);
  }
  if (pinching) {
    if (pointers.size === 2) {
      const [p1, p2] = Array.from(pointers.values());
      const newDist = distance(p1, p2);
      scale = startScale * newDist / startDistance;
      const newAngle = angle(p1, p2);
      rotation = startRotation + newAngle - startAngle;
      const newCentroid = { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 };
      offsetX = startOffsetX + (newCentroid.x - startCentroid.x);
      offsetY = startOffsetY + (newCentroid.y - startCentroid.y);
      updateTransform();
    }
    return;
  }
  if (!drawing) return;
  const pos = getCanvasCoords(e);
  const now = performance.now();
  const dt = now - lastTime || 16;
  const dist = Math.hypot(pos.x - lastPoint.x, pos.y - lastPoint.y);
  const speed = dist / dt;
  canvas.style.filter = speed > 0.8 ? 'blur(1px)' : 'none';
  ctx.lineTo(pos.x + (Math.random()-0.5), pos.y + (Math.random()-0.5));
  ctx.stroke();
  lastPoint = pos;
  lastTime = now;
}

function pointerUp(e) {
  if (pointers.has(e.pointerId)) {
    const p = pointers.get(e.pointerId);
    p.x = e.clientX;
    p.y = e.clientY;
    pointers.set(e.pointerId, p);
  }
  if (pinching) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      pinching = false;
      if (swipeGesture) {
        const [id1, id2] = swipeGesture.ids;
        const p1 = pointers.get(id1);
        const p2 = pointers.get(id2);
        if (p1 && p2) {
          const dx1 = p1.x - p1.startX;
          const dx2 = p2.x - p2.startX;
          const dy1 = p1.y - p1.startY;
          const dy2 = p2.y - p2.startY;
          if (Math.abs(dx1) > 80 && Math.abs(dx2) > 80 && Math.abs(dy1) < 50 && Math.abs(dy2) < 50 && Math.sign(dx1) === Math.sign(dx2)) {
            if (dx1 < 0) undoBtn.click();
            else redoBtn.click();
          }
        }
        swipeGesture = null;
      }
    }
    return;
  }
  if (!drawing) return;
  drawing = false;
  ctx.closePath();
  ctx.globalCompositeOperation = 'source-over';
  canvas.releasePointerCapture(e.pointerId);
  saveState();
  canvas.style.filter = 'none';
  pointers.delete(e.pointerId);
}

layers.forEach(layer => {
  layer.addEventListener('pointerdown', pointerDown);
  layer.addEventListener('pointermove', pointerMove);
  layer.addEventListener('pointerup',   pointerUp);
  layer.addEventListener('pointerout',  pointerUp);
  layer.addEventListener('pointercancel', pointerUp);
});

clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

undoBtn.addEventListener('click', () => {
  const h = history[activeLayer];
  const r = redoStack[activeLayer];
  if (h.length > 0) {
    r.push(canvas.toDataURL());
    const data = h.pop();
    restoreState(data);
  }
});

redoBtn.addEventListener('click', () => {
  const h = history[activeLayer];
  const r = redoStack[activeLayer];
  if (r.length > 0) {
    h.push(canvas.toDataURL());
    const data = r.pop();
    restoreState(data);
  }
});

fillBtn.addEventListener('click', () => {
  ctx.fillStyle = hexToRGBA(colorPicker.value, opacityPicker.value / 100);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
});

eyedropperBtn.addEventListener('click', () => {
  currentTool = currentTool === 'eyedropper' ? 'brush' : 'eyedropper';
  if (currentTool === 'eyedropper') {
    eyedropperBtn.classList.add('active');
  } else {
    eyedropperBtn.classList.remove('active');
  }
});

function updateTransform() {
  layers.forEach(layer => {
    layer.style.transformOrigin = '0 0';
    layer.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale}) rotate(${rotation}rad)`;
  });
}

function zoomAt(factor) {
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  offsetX = cx - ((cx - offsetX) * factor);
  offsetY = cy - ((cy - offsetY) * factor);
  scale *= factor;
  updateTransform();
}

zoomInBtn.addEventListener('click', () => zoomAt(1.2));
zoomOutBtn.addEventListener('click', () => zoomAt(1 / 1.2));

updateTransform();

saveBtn.addEventListener('click', () => {
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const offCtx = off.getContext('2d');
  layers.forEach(l => offCtx.drawImage(l, 0, 0));
  const url = off.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = url;
  link.click();

  const img = document.createElement('img');
  img.src = url;
  img.alt = 'snapshot';
  img.className = 'snapshot';
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 3000);
});

function saveTimelapse() {
  if (timelapseFrames.length === 0 || typeof GIF !== 'function') return;
  const gif = new GIF({workers:2, quality:10});
  timelapseFrames.forEach(c => gif.addFrame(c, {delay:200}));
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'timelapse.gif';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  });
  gif.render();
}

let saveHold;
saveBtn.addEventListener('pointerdown', () => {
  saveHold = setTimeout(saveTimelapse, 600);
});
['pointerup','pointercancel','pointerout'].forEach(ev => {
  saveBtn.addEventListener(ev, () => clearTimeout(saveHold));
});

let audioCtx, noiseSource;
function toggleAmbient() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseSource = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.05;
    noiseSource.buffer = buffer;
    noiseSource.loop = true;
    noiseSource.connect(gain).connect(audioCtx.destination);
    noiseSource.start();
  } else {
    if (audioCtx.state === 'running') audioCtx.suspend();
    else audioCtx.resume();
  }
}

ambientBtn.addEventListener('click', toggleAmbient);

gridBtn.addEventListener('click', () => {
  gridOverlay.style.display = gridOverlay.style.display === 'none' ? 'block' : 'none';
});

const toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
toggleToolbarBtn.addEventListener('click', () => {
  toolbar.classList.toggle('collapsed');
  toggleToolbarBtn.textContent = toolbar.classList.contains('collapsed') ? '▲' : '▼';
});

moreBtn.addEventListener('click', () => {
  toolbar.classList.toggle('show-advanced');
});

function resetToolbarTimer() {
  clearTimeout(toolbarTimer);
  toolbarTimer = setTimeout(() => {
    toolbar.classList.add('collapsed');
    toggleToolbarBtn.textContent = '▲';
  }, 5000);
}

window.addEventListener('pointerdown', () => {
  if (toolbar.classList.contains('collapsed')) {
    toolbar.classList.remove('collapsed');
    toggleToolbarBtn.textContent = '▼';
  }
  resetToolbarTimer();
});
window.addEventListener('pointermove', resetToolbarTimer);
resetToolbarTimer();

export { history, redoStack, saveState };
