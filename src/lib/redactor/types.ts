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
}

export const DEFAULT_REDACTION: RedactionOptions = {
  mode: "blur",
  strength: 60,
  padding: 0.18,
};
