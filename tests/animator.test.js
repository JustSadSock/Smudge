import { renderFrameRailHTML } from '../src/renderRail.js';
import { JSDOM } from 'jsdom';

test('renderFrameRailHTML adds alt attributes', () => {
  const dom = new JSDOM('<div id="frameRail"></div>');
  const { document } = dom.window;
  const frameRail = document.getElementById('frameRail');
  frameRail.innerHTML = renderFrameRailHTML(['a','b'], 0);
  const imgs = frameRail.querySelectorAll('img');
  expect(Array.from(imgs).every(img => img.hasAttribute('alt'))).toBe(true);
});
