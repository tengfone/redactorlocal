import type { FaceBox, RedactionMode, RedactionOptions } from "./types";

interface PaddedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function padRect(
  box: FaceBox,
  padding: number,
  canvasW: number,
  canvasH: number,
): PaddedRect {
  const padX = box.w * padding;
  const padY = box.h * padding;
  let x = box.x - padX;
  let y = box.y - padY;
  let w = box.w + padX * 2;
  let h = box.h + padY * 2;
  // clamp to canvas bounds
  if (x < 0) {
    w += x;
    x = 0;
  }
  if (y < 0) {
    h += y;
    y = 0;
  }
  if (x + w > canvasW) w = canvasW - x;
  if (y + h > canvasH) h = canvasH - y;
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  };
}

function regionPath(
  ctx: CanvasRenderingContext2D,
  rect: PaddedRect,
  radius: number,
) {
  const { x, y, w, h } = rect;
  const r = Math.min(Math.max(0, radius), 0.5) * Math.min(w, h);
  ctx.beginPath();
  if (r <= 0.5) {
    ctx.rect(x, y, w, h);
  } else {
    ctx.roundRect(x, y, w, h, r);
  }
}

function redactRegion(
  ctx: CanvasRenderingContext2D,
  rect: PaddedRect,
  mode: RedactionMode,
  strength: number,
  radius: number,
) {
  const { x, y, w, h } = rect;
  const size = Math.max(w, h);
  const intensity = Math.max(0, Math.min(100, strength)) / 100;

  if (mode === "box") {
    ctx.save();
    ctx.fillStyle = "#000000";
    regionPath(ctx, rect, radius);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (mode === "blur") {
    const blurPx = Math.max(4, Math.round(size * 0.6 * intensity));
    ctx.save();
    regionPath(ctx, rect, radius);
    ctx.clip();
    // Drawing the canvas back onto itself with a blur filter, clipped to the
    // region, blurs only the selected area.
    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    ctx.restore();
    return;
  }

  // pixelate
  const block = Math.max(4, Math.round(size * 0.18 * intensity));
  const smallW = Math.max(1, Math.round(w / block));
  const smallH = Math.max(1, Math.round(h / block));
  const tmp = document.createElement("canvas");
  tmp.width = smallW;
  tmp.height = smallH;
  const tctx = tmp.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, smallW, smallH);
  ctx.save();
  regionPath(ctx, rect, radius);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, smallW, smallH, x, y, w, h);
  ctx.restore();
}

export interface ApplyTarget extends FaceBox {
  keep?: boolean;
}

/**
 * Apply redaction to every face in the list except those flagged `keep`.
 * Operates in-place on the provided 2D context (which must already contain the
 * source frame/image).
 */
export function applyRedaction(
  ctx: CanvasRenderingContext2D,
  faces: ApplyTarget[],
  options: RedactionOptions,
) {
  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;
  for (const face of faces) {
    if (face.keep) continue;
    const rect = padRect(face, options.padding, canvasW, canvasH);
    redactRegion(ctx, rect, options.mode, options.strength, options.radius);
  }
}
