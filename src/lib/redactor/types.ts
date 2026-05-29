export type RedactionMode = "blur" | "pixelate" | "box";

export type ExecutionProvider = "webgpu" | "wasm";

export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

export interface TrackedFace extends FaceBox {
  id: number;
}

export interface RedactionOptions {
  mode: RedactionMode;
  /** 0 - 100 slider value controlling intensity. */
  strength: number;
  /** Fraction of the face size to expand the region by (0 - 1). */
  padding: number;
  /** Corner radius as a fraction of the region's shorter side (0 - 0.5). */
  radius: number;
}

export const DEFAULT_REDACTION: RedactionOptions = {
  mode: "blur",
  strength: 60,
  padding: 0.18,
  radius: 0,
};
