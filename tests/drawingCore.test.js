import { saveState, restoreState } from '../src/drawingCore.js';

class DummyImage {
  constructor() {
    this.onload = null;
  }
  set src(_) {
    if (this.onload) this.onload();
  }
}

test('saveState manages history and redo', () => {
  const h = [];
  const r = ['a'];
  saveState(h, r, 'data1');
  expect(h).toEqual(['data1']);
  expect(r.length).toBe(0);
});

test('restoreState clears then draws', () => {
  const calls = [];
  const ctx = {
    canvas: { width: 10, height: 10 },
    clearRect: () => calls.push('clear'),
    drawImage: () => calls.push('draw')
  };
  global.Image = DummyImage;
  restoreState(ctx, 'data');
  expect(calls).toEqual(['clear', 'draw']);
});
