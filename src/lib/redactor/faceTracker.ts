import type { FaceBox, TrackedFace } from "./types";

function iou(a: FaceBox, b: FaceBox): number {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const ix1 = Math.max(a.x, b.x);
  const iy1 = Math.max(a.y, b.y);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

interface Track {
  id: number;
  box: FaceBox;
  missed: number;
}

/**
 * Lightweight IoU tracker that assigns a stable id to a face across frames so
 * the user's "keep visible" choice follows the same person through a video.
 */
export class FaceTracker {
  private tracks: Track[] = [];
  private nextId = 1;

  constructor(
    private iouThreshold = 0.3,
    private maxMissed = 12,
  ) {}

  reset() {
    this.tracks = [];
    this.nextId = 1;
  }

  update(detections: FaceBox[]): TrackedFace[] {
    const usedTracks = new Set<number>();
    const result: TrackedFace[] = [];

    for (const det of detections) {
      let bestId = -1;
      let bestIou = this.iouThreshold;
      for (const track of this.tracks) {
        if (usedTracks.has(track.id)) continue;
        const score = iou(det, track.box);
        if (score >= bestIou) {
          bestIou = score;
          bestId = track.id;
        }
      }

      if (bestId === -1) {
        const id = this.nextId++;
        this.tracks.push({ id, box: det, missed: 0 });
        usedTracks.add(id);
        result.push({ ...det, id });
      } else {
        usedTracks.add(bestId);
        const track = this.tracks.find((t) => t.id === bestId)!;
        track.box = det;
        track.missed = 0;
        result.push({ ...det, id: bestId });
      }
    }

    // age out unmatched tracks
    this.tracks = this.tracks.filter((track) => {
      if (usedTracks.has(track.id)) return true;
      track.missed += 1;
      return track.missed <= this.maxMissed;
    });

    return result;
  }
}
