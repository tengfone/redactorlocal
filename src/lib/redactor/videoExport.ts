import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { applyRedaction } from "./redaction";
import type { FaceBox, RedactionOptions } from "./types";

export interface ExportFace extends FaceBox {
  keep?: boolean;
}

export interface ExportVideoParams {
  video: HTMLVideoElement;
  width: number;
  height: number;
  fps: number;
  options: RedactionOptions;
  /** Detect faces for the frame currently drawn on the video element. */
  detect: (
    source: HTMLVideoElement,
    w: number,
    h: number,
  ) => Promise<ExportFace[]>;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export function isVideoExportSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { VideoEncoder?: unknown }).VideoEncoder !==
      "undefined" &&
    typeof (window as unknown as { VideoFrame?: unknown }).VideoFrame !==
      "undefined"
  );
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = Math.min(time, video.duration || time);
  });
}

/**
 * Re-encode a redacted copy of the video entirely in the browser using
 * WebCodecs + mp4-muxer. Steps through the source frame-by-frame, runs
 * detection, applies redaction, then encodes. Audio is not carried over.
 */
export async function exportRedactedVideo(
  params: ExportVideoParams,
): Promise<Blob> {
  const { video, width, height, fps, options, detect, onProgress, signal } =
    params;

  if (!isVideoExportSupported()) {
    throw new Error("WEBCODECS_UNSUPPORTED");
  }

  const VideoEncoderCtor = (window as unknown as { VideoEncoder: any })
    .VideoEncoder;
  const VideoFrameCtor = (window as unknown as { VideoFrame: any }).VideoFrame;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "avc",
      width,
      height,
    },
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoderCtor({
    output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
    error: (err: unknown) => console.error("[redactor] encoder error", err),
  });

  encoder.configure({
    codec: "avc1.42001f",
    width,
    height,
    bitrate: 5_000_000,
    framerate: fps,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("CANVAS_UNAVAILABLE");

  const wasPaused = video.paused;
  video.pause();

  const duration = video.duration;
  const frameDuration = 1 / fps;
  const totalFrames = Math.max(1, Math.floor(duration * fps));

  try {
    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) throw new Error("ABORTED");
      const t = i * frameDuration;
      await seek(video, t);
      ctx.drawImage(video, 0, 0, width, height);
      const faces = await detect(video, width, height);
      applyRedaction(ctx, faces, options);

      const frame = new VideoFrameCtor(canvas, {
        timestamp: Math.round(t * 1_000_000),
        duration: Math.round(frameDuration * 1_000_000),
      });
      // keyframe roughly every 2 seconds
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      onProgress?.((i + 1) / totalFrames);
      // Yield to keep the UI responsive.
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    await encoder.flush();
    muxer.finalize();
  } finally {
    if (!wasPaused) {
      // best effort restore
      video.play().catch(() => {});
    }
  }

  const { buffer } = muxer.target as ArrayBufferTarget;
  return new Blob([buffer], { type: "video/mp4" });
}
