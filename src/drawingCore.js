export function beginStroke(ctx, style, pos) {
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = style.opacity;
  ctx.lineWidth = style.size;
  ctx.globalCompositeOperation =
    style.shape === 'eraser' ? 'destination-out' : 'source-over';
  ctx.lineCap = ctx.lineJoin = style.shape === 'square' ? 'butt' : 'round';
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

export function drawStroke(ctx, pos) {
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

export function endStroke(ctx) {
  ctx.closePath();
  ctx.globalCompositeOperation = 'source-over';
}

export function saveState(history, redoStack, data) {
  history.push(data);
  if (history.length > 50) history.shift();
  redoStack.length = 0;
}

export function restoreState(ctx, data, canvasOverride = null) {
  const c = canvasOverride || ctx.canvas;
  ctx.clearRect(0, 0, c.width, c.height);
  if (!data) return;
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0);
  img.src = data;
}
