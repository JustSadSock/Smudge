import { JSDOM } from 'jsdom';

const markup = `
<div id="toolbar"></div>
<button id="toggleToolbarBtn"></button>
<button id="moreBtn"></button>
<input id="colorPicker" />
<input id="opacityPicker" />
<input id="sizePicker" />
<select id="brushShape"></select>
<button id="zoomInBtn"></button>
<button id="zoomOutBtn"></button>
<button id="undoBtn"></button>
<button id="redoBtn"></button>
<button id="fillBtn"></button>
<button id="eyedropperBtn"></button>
<button id="clearBtn"></button>
<button id="saveBtn"></button>
<button id="ambientBtn"></button>
<button id="gridBtn"></button>
<div id="quickPalette"></div>
<input id="sessionCode" />
<button id="connectBtn"></button>
<select id="layerSelect"><option value="1">1</option><option value="0">0</option></select>
<label><input type="checkbox" id="showLayer0" checked></label>
<label><input type="checkbox" id="showLayer1" checked></label>
<canvas id="layer0"></canvas>
<canvas id="layer1"></canvas>
<div id="gridOverlay"></div>
`;

const dummyCtx = {
  clearRect() {},
  drawImage() {},
  getImageData() { return { data: [0,0,0,255] }; },
  beginPath() {},
  moveTo() {},
  lineTo() {},
  stroke() {},
  closePath() {},
  fillRect() {},
};

let game;
let windowRef;

beforeEach(async () => {
  const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, {
    pretendToBeVisual: true,
    url: 'http://localhost/'
  });
  windowRef = dom.window;
  global.window = dom.window;
  global.document = dom.window.document;
  global.Image = dom.window.Image;
  global.localStorage = dom.window.localStorage;
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'getContext', { value: () => dummyCtx });
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype, 'toDataURL', { value: () => 'data:' + Math.random() });
  game = await import('../src/game.js');
  game.history[0].length = 0;
  game.history[1].length = 0;
  game.redoStack[0].length = 0;
  game.redoStack[1].length = 0;
});

test('undo and redo are tracked per layer', () => {
  const { document } = windowRef;
  const layerSelect = document.getElementById('layerSelect');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  game.saveState();
  const first1 = game.history[1][0];

  layerSelect.value = '0';
  layerSelect.dispatchEvent(new windowRef.Event('change'));
  game.saveState();
  const first0 = game.history[0][0];

  layerSelect.value = '1';
  layerSelect.dispatchEvent(new windowRef.Event('change'));
  game.saveState();
  const second1 = game.history[1][1];

  expect(game.history[1]).toEqual([first1, second1]);
  expect(game.history[0]).toEqual([first0]);

  undoBtn.dispatchEvent(new windowRef.Event('click'));
  expect(game.history[1]).toEqual([first1]);
  expect(game.redoStack[1].length).toBe(1);
  expect(game.redoStack[0].length).toBe(0);

  layerSelect.value = '0';
  layerSelect.dispatchEvent(new windowRef.Event('change'));
  undoBtn.dispatchEvent(new windowRef.Event('click'));
  expect(game.history[0].length).toBe(0);
  expect(game.redoStack[0].length).toBe(1);

  redoBtn.dispatchEvent(new windowRef.Event('click'));
  expect(game.history[0].length).toBe(1);
  expect(game.redoStack[0].length).toBe(0);
  expect(game.history[1]).toEqual([first1]);
  expect(game.redoStack[1].length).toBe(1);
});
