import * as ort from "onnxruntime-web/webgpu";
import type { ExecutionProvider, FaceBox } from "./types";

/**
 * SCRFD-2.5G face detector (InsightFace). A modern, lightweight anchor-based
 * detector (~3.3 MB) that dramatically out-performs the old Ultraface RFB-320
 * on crowds, masked faces and small/distant faces. Fully convolutional with
 * three stride levels (8 / 16 / 32).
 */
const MODEL_URL = "/models/scrfd_2.5g.onnx";
const INPUT = 640;
const STRIDES = [8, 16, 32] as const;
const NUM_ANCHORS = 2;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let activeProvider: ExecutionProvider = "wasm";

// Pre-computed anchor centres per stride (independent of the image).
const anchorCache = new Map<number, Float32Array>();

function anchorCenters(stride: number): Float32Array {
  const cached = anchorCache.get(stride);
  if (cached) return cached;
  const dim = INPUT / stride;
  const out = new Float32Array(dim * dim * NUM_ANCHORS * 2);
  let p = 0;
  for (let gy = 0; gy < dim; gy++) {
    for (let gx = 0; gx < dim; gx++) {
      for (let a = 0; a < NUM_ANCHORS; a++) {
        out[p++] = gx * stride;
        out[p++] = gy * stride;
      }
    }
  }
  anchorCache.set(stride, out);
  return out;
}

export function getActiveProvider(): ExecutionProvider {
  return activeProvider;
}

function configureEnv() {
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = 1;
}

async function createSession(): Promise<ort.InferenceSession> {
  configureEnv();
  const hasWebGPU =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { gpu?: unknown }).gpu !== "undefined";

  if (hasWebGPU) {
    try {
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ["webgpu"],
      });
      activeProvider = "webgpu";
      return session;
    } catch (err) {
      console.warn("[redactor] WebGPU unavailable, falling back to WASM", err);
    }
  }

  const session = await ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ["wasm"],
  });
  activeProvider = "wasm";
  return session;
}

export function loadDetector(): Promise<ort.InferenceSession> {
  if (!sessionPromise) sessionPromise = createSession();
  return sessionPromise;
}

type DrawableSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement
  | ImageBitmap;

// Re-usable letterbox canvas (640x640).
let lbCanvas: HTMLCanvasElement | null = null;
let lbCtx: CanvasRenderingContext2D | null = null;

interface Prepared {
  tensor: ort.Tensor;
  scale: number;
}

/**
 * Letterbox a (sub-)region of the source into a 640x640 RGB NCHW tensor.
 * `scale` maps detector-space coordinates back to the source region.
 */
function preprocess(
  source: DrawableSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Prepared {
  if (!lbCanvas) {
    lbCanvas = document.createElement("canvas");
    lbCanvas.width = INPUT;
    lbCanvas.height = INPUT;
    lbCtx = lbCanvas.getContext("2d", { willReadFrequently: true });
  }
  const ctx = lbCtx!;
  const scale = Math.min(INPUT / sw, INPUT / sh);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, INPUT, INPUT);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);

  const { data } = ctx.getImageData(0, 0, INPUT, INPUT);
  const area = INPUT * INPUT;
  const out = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    out[i] = (data[i * 4] - 127.5) / 128;
    out[i + area] = (data[i * 4 + 1] - 127.5) / 128;
    out[i + 2 * area] = (data[i * 4 + 2] - 127.5) / 128;
  }
  return {
    tensor: new ort.Tensor("float32", out, [1, 3, INPUT, INPUT]),
    scale,
  };
}

function iou(a: FaceBox, b: FaceBox): number {
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.w, b.x + b.w);
  const iy2 = Math.min(a.y + a.h, b.y + b.h);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

function nms(boxes: FaceBox[], threshold: number): FaceBox[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const keep: FaceBox[] = [];
  for (const box of sorted) {
    if (!keep.some((k) => iou(box, k) > threshold)) keep.push(box);
  }
  return keep;
}

async function runRegion(
  session: ort.InferenceSession,
  source: DrawableSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  scoreThreshold: number,
): Promise<FaceBox[]> {
  const { tensor, scale } = preprocess(source, sx, sy, sw, sh);
  const results = await session.run({ [session.inputNames[0]]: tensor });

  const out: FaceBox[] = [];
  for (const stride of STRIDES) {
    const scoreT = results[`score_${stride}`];
    const bboxT = results[`bbox_${stride}`];
    if (!scoreT || !bboxT) continue;
    const scores = scoreT.data as Float32Array;
    const bbox = bboxT.data as Float32Array;
    const centers = anchorCenters(stride);
    const n = scores.length;
    for (let i = 0; i < n; i++) {
      const conf = scores[i];
      if (conf < scoreThreshold) continue;
      const cx = centers[i * 2];
      const cy = centers[i * 2 + 1];
      const l = bbox[i * 4] * stride;
      const t = bbox[i * 4 + 1] * stride;
      const r = bbox[i * 4 + 2] * stride;
      const b = bbox[i * 4 + 3] * stride;
      const x1 = (cx - l) / scale + sx;
      const y1 = (cy - t) / scale + sy;
      const x2 = (cx + r) / scale + sx;
      const y2 = (cy + b) / scale + sy;
      out.push({ x: x1, y: y1, w: x2 - x1, h: y2 - y1, score: conf });
    }
  }
  return out;
}

export interface DetectOptions {
  scoreThreshold?: number;
  iouThreshold?: number;
  /**
   * Run an additional grid of overlapping tiles to recover small / distant
   * faces. Worth the extra latency on still images; skip it for video frames.
   */
  tiled?: boolean;
}

/**
 * Detect faces in a drawable source. Returns boxes in the source's pixel space.
 */
export async function detectFaces(
  source: DrawableSource,
  srcW: number,
  srcH: number,
  options: DetectOptions = {},
): Promise<FaceBox[]> {
  const scoreThreshold = options.scoreThreshold ?? 0.4;
  const iouThreshold = options.iouThreshold ?? 0.4;
  const session = await loadDetector();

  const candidates = await runRegion(
    session,
    source,
    0,
    0,
    srcW,
    srcH,
    scoreThreshold,
  );

  if (options.tiled && Math.min(srcW, srcH) > 320) {
    const nx = 3;
    const ny = 3;
    const ov = 0.25;
    const tw = srcW / nx;
    const th = srcH / ny;
    for (let gy = 0; gy < ny; gy++) {
      for (let gx = 0; gx < nx; gx++) {
        const x0 = Math.max(0, Math.floor(gx * tw - ov * tw));
        const y0 = Math.max(0, Math.floor(gy * th - ov * th));
        const x1 = Math.min(srcW, Math.ceil((gx + 1) * tw + ov * tw));
        const y1 = Math.min(srcH, Math.ceil((gy + 1) * th + ov * th));
        const region = await runRegion(
          session,
          source,
          x0,
          y0,
          x1 - x0,
          y1 - y0,
          scoreThreshold,
        );
        candidates.push(...region);
      }
    }
  }

  return nms(candidates, iouThreshold);
}
