# Smudge

Smudge is a minimalistic browser-based drawing and animation app. It follows the pastel design guidelines described in [STYLE.md](STYLE.md), using a soft palette and simple rounded icons with smooth transitions.

## Features
- **Drawing tools** with color, opacity and size controls.
- Quick palette, fill bucket and eyedropper.
- Undo/redo history and canvas clearing.
- Two **layers** with visibility toggles.
- Zoom controls and optional grid overlay.
- Save drawings with a Polaroid-style effect.
- Automatic **timelapse** GIF of your work.
- Ambient noise toggle for atmosphere.
- Project **import/export** to continue editing later.
- **Animator** mode for frame-by-frame animation with onion skinning, playback, GIF or video export.
- **Local network** collaboration by entering a shared code.

## Installation
1. Install dependencies:
```bash
npm install
```
2. Run tests:
```bash
npm test
```
3. Open `index.html` to draw or `animator.html` for animation in your browser. A simple HTTP server or direct file open both work.
4. To share a session over a local network, run:
```bash
npm start
```
Enter the same code on each device and press the link button.
