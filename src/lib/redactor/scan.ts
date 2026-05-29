import { FaceTracker } from "./faceTracker";
import type { FaceBox } from "./types";

export interface TrajectorySample {
  t: number;
  box: FaceBox;
}

export interface FaceTrajectory {
  id: number;
  samples: TrajectorySample[];
  best: { box: FaceBox; score: number; t: number };
}

interface ScanParams {
  duration: number;
  seek: (t: number) => Promise<void>;
  detect: () => Promise<FaceBox[]>;
  maxSamples?: number;
  onProgress?: (ratio: number) => void;
  onFaces?: (count: number) => void;
  signal?: AbortSignal;
}

/**
 * Step through a video once, detecting faces and tracking them into stable
 * trajectories. This single pass is the source of truth for both preview and
 * export, so the user's "keep visible" choices stay perfectly consistent.
 */
export async function scanVideo(
  params: ScanParams,
): Promise<{ trajectories: FaceTrajectory[]; step: number }> {
  const { duration, seek, detect, onProgress, onFaces, signal } = params;
  const maxSamples = params.maxSamples ?? 220;
  const step = Math.min(0.5, Math.max(0.12, duration / maxSamples));
  const tracker = new FaceTracker(0.3, 4);
  const map = new Map<number, FaceTrajectory>();

  const total = Math.max(1, Math.ceil(duration / step));
  let i = 0;

  for (let t = 0; t <= duration + 1e-3; t += step) {
    if (signal?.aborted) break;
    await seek(Math.min(t, duration));
    const dets = await detect();
    const tracked = tracker.update(dets);
    for (const f of tracked) {
      let traj = map.get(f.id);
      if (!traj) {
        traj = {
          id: f.id,
          samples: [],
          best: { box: f, score: f.score, t },
        };
        map.set(f.id, traj);
      }
      traj.samples.push({
        t,
        box: { x: f.x, y: f.y, w: f.w, h: f.h, score: f.score },
      });
      if (f.score > traj.best.score) {
        traj.best = { box: f, score: f.score, t };
      }
    }
    i += 1;
    onProgress?.(Math.min(1, i / total));
  }

  const trajectories = [...map.values()]
    .filter((tr) => tr.samples.length >= 2 || tr.best.score >= 0.85)
    .sort((a, b) => a.best.t - b.best.t)
    .map((tr, idx) => ({ ...tr, id: idx + 1 }));

  return { trajectories, step };
}

/** Resolve which faces are present at a given time (nearest sample). */
export function boxesAt(
  trajectories: FaceTrajectory[],
  t: number,
  window: number,
): { id: number; box: FaceBox }[] {
  const out: { id: number; box: FaceBox }[] = [];
  for (const tr of trajectories) {
    let nearest: TrajectorySample | null = null;
    let nd = Infinity;
    for (const s of tr.samples) {
      const d = Math.abs(s.t - t);
      if (d < nd) {
        nd = d;
        nearest = s;
      }
    }
    if (nearest && nd <= window) out.push({ id: tr.id, box: nearest.box });
  }
  return out;
}
