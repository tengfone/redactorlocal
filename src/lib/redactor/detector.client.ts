import * as ort from "onnxruntime-web/webgpu";
import type { ExecutionProvider, FaceBox } from "./types";

const MODEL_URL = "/models/version-RFB-320.onnx";
const IN_W = 320;
const IN_H = 240;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let activeProvider: ExecutionProvider = "wasm";
let preCanvas: HTMLCanvasElement | null = null;
let preCtx: CanvasRenderingContext2D | null = null;

export function getActiveProvider(): ExecutionProvider {
  return activeProvider;
}

function configureEnv() {
  ort.env.wasm.wasmPaths = "/ort/";
  // SharedArrayBuffer / cross-origin isolation is not guaranteed, so keep the
  // wasm backend single-threaded to stay portable.
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
  if (!sessionPromise) {
    sessionPromise = createSession();
  }
  return sessionPromise;
}

type DrawableSource =
  | HTMLImageElement
  | HTMLVideoElement
  | HTMLCanvasElement
  | ImageBitmap;

function preprocess(source: DrawableSource): Float32Array {
  if (!preCanvas) {
    preCanvas = document.createElement("canvas");
    preCanvas.width = IN_W;
    preCanvas.height = IN_H;
    preCtx = preCanvas.getContext("2d", { willReadFrequently: true });
  }
  const ctx = preCtx!;
  ctx.drawImage(source, 0, 0, IN_W, IN_H);
  const { data } = ctx.getImageData(0, 0, IN_W, IN_H);
  const area = IN_W * IN_H;
  const out = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    out[i] = (r - 127) / 128;
    out[i + area] = (g - 127) / 128;
    out[i + 2 * area] = (b - 127) / 128;
  }
  return out;
}

function nms(boxes: FaceBox[], iouThreshold: number): FaceBox[] {
  const sorted = [...boxes].sort((a, b) => b.score - a.score);
  const keep: FaceBox[] = [];
  for (const box of sorted) {
    let overlaps = false;
    for (const k of keep) {
      const ix1 = Math.max(box.x, k.x);
      const iy1 = Math.max(box.y, k.y);
      const ix2 = Math.min(box.x + box.w, k.x + k.w);
      const iy2 = Math.min(box.y + box.h, k.y + k.h);
      const iw = Math.max(0, ix2 - ix1);
      const ih = Math.max(0, iy2 - iy1);
      const inter = iw * ih;
      const union = box.w * box.h + k.w * k.h - inter;
      if (union > 0 && inter / union > iouThreshold) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) keep.push(box);
  }
  return keep;
}

export interface DetectOptions {
  scoreThreshold?: number;
  iouThreshold?: number;
}

/**
 * Run the Ultraface RFB-320 detector on a drawable source. Returns face boxes
 * in the source's pixel coordinate space (using srcW/srcH).
 */
export async function detectFaces(
  source: DrawableSource,
  srcW: number,
  srcH: number,
  options: DetectOptions = {},
): Promise<FaceBox[]> {
  const scoreThreshold = options.scoreThreshold ?? 0.7;
  const iouThreshold = options.iouThreshold ?? 0.3;
  const session = await loadDetector();

  const input = preprocess(source);
  const tensor = new ort.Tensor("float32", input, [1, 3, IN_H, IN_W]);
  const feeds: Record<string, ort.Tensor> = {
    [session.inputNames[0]]: tensor,
  };
  const results = await session.run(feeds);

  let scoresT: ort.Tensor | undefined;
  let boxesT: ort.Tensor | undefined;
  for (const name of session.outputNames) {
    const t = results[name];
    const last = t.dims[t.dims.length - 1];
    if (last === 2) scoresT = t;
    else if (last === 4) boxesT = t;
  }
  if (!scoresT || !boxesT) return [];

  const scores = scoresT.data as Float32Array;
  const boxData = boxesT.data as Float32Array;
  const count = boxesT.dims[1];

  const candidates: FaceBox[] = [];
  for (let i = 0; i < count; i++) {
    const conf = scores[i * 2 + 1];
    if (conf < scoreThreshold) continue;
    const x1 = boxData[i * 4] * srcW;
    const y1 = boxData[i * 4 + 1] * srcH;
    const x2 = boxData[i * 4 + 2] * srcW;
    const y2 = boxData[i * 4 + 3] * srcH;
    candidates.push({
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
      score: conf,
    });
  }

  return nms(candidates, iouThreshold);
}
