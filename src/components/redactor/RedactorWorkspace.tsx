import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Play, Pause, RefreshCw, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Dropzone } from "./Dropzone";
import { PrivacyBadge } from "./PrivacyBadge";
import { StatusBar } from "./StatusBar";
import { RedactionControls } from "./RedactionControls";
import { ScanOverlay } from "./ScanOverlay";
import { FaceSelectionPanel } from "./FaceSelectionPanel";
import { applyRedaction } from "@/lib/redactor/redaction";
import {
  DEFAULT_REDACTION,
  type ExecutionProvider,
  type FaceBox,
  type RedactionOptions,
  type TrackedFace,
} from "@/lib/redactor/types";

/** Shape of the dynamically-imported client-only detector module. */
type DetectorModule = {
  loadDetector: () => Promise<unknown>;
  getActiveProvider: () => ExecutionProvider;
  detectFaces: (
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    srcW: number,
    srcH: number,
    options?: { tiled?: boolean; scoreThreshold?: number },
  ) => Promise<FaceBox[]>;
};
import {
  scanVideo,
  boxesAt,
  type FaceTrajectory,
} from "@/lib/redactor/scan";

type MediaType = "image" | "video";
type ModelStatus = "idle" | "loading" | "ready" | "error";

export function RedactorWorkspace() {
  const online = useOnlineStatus();

  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<RedactionOptions>(DEFAULT_REDACTION);
  const [faces, setFaces] = useState<TrackedFace[]>([]);
  const [keepMap, setKeepMap] = useState<Record<number, boolean>>({});
  const [overlay, setOverlay] = useState<{ id: number; box: TrackedFace }[]>([]);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("idle");
  const [provider, setProvider] = useState<ExecutionProvider | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanFaces, setScanFaces] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const facesRef = useRef<TrackedFace[]>([]);
  const keepRef = useRef<Record<number, boolean>>({});
  const optionsRef = useRef(options);
  const trajRef = useRef<FaceTrajectory[]>([]);
  const stepRef = useRef(0.2);
  const rafRef = useRef<number | null>(null);
  const overlayTickRef = useRef(0);
  const detectModRef = useRef<DetectorModule | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    keepRef.current = keepMap;
  }, [keepMap]);

  const ensureDetector = useCallback(async () => {
    if (!detectModRef.current) {
      setModelStatus("loading");
      try {
        const mod = await import("@/lib/redactor/detector.runtime");
        await mod.loadDetector();
        detectModRef.current = mod;
        setProvider(mod.getActiveProvider());
        setModelStatus("ready");
      } catch (err) {
        console.error(err);
        setModelStatus("error");
        throw err;
      }
    }
    return detectModRef.current;
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const seekVideo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const onSeeked = () => {
        v.removeEventListener("seeked", onSeeked);
        resolve();
      };
      v.addEventListener("seeked", onSeeked);
      v.currentTime = Math.min(time, v.duration || time);
    });
  }, []);

  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const applyFaces = facesRef.current.map((f) => ({
      ...f,
      keep: keepRef.current[f.id] ?? false,
    }));
    applyRedaction(ctx, applyFaces, optionsRef.current);
  }, []);

  // Re-render still images when controls or selections change.
  useEffect(() => {
    if (mediaType === "image") renderImage();
  }, [mediaType, options, keepMap, faces, renderImage]);

  const videoLoop = useCallback(() => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (v && canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const present = boxesAt(
          trajRef.current,
          v.currentTime,
          stepRef.current * 1.75,
        );
        const applyFaces = present.map((p) => ({
          ...p.box,
          keep: keepRef.current[p.id] ?? false,
        }));
        applyRedaction(ctx, applyFaces, optionsRef.current);

        const now = performance.now();
        if (now - overlayTickRef.current > 70) {
          overlayTickRef.current = now;
          setOverlay(
            present.map((p) => ({ id: p.id, box: { ...p.box, id: p.id } })),
          );
        }
      }
    }
    rafRef.current = requestAnimationFrame(videoLoop);
  }, []);

  const reset = useCallback(() => {
    stopLoop();
    abortRef.current?.abort();
    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    setMediaType(null);
    setMediaUrl(null);
    setFaces([]);
    setKeepMap({});
    setOverlay([]);
    setPlaying(false);
    setScanProgress(0);
    setScanFaces(0);
    setExportProgress(0);
    facesRef.current = [];
    keepRef.current = {};
    trajRef.current = [];
  }, [mediaUrl, stopLoop]);

  const handleImage = useCallback(
    async (url: string) => {
      const img = new Image();
      img.onload = async () => {
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        setSize({ w: img.naturalWidth, h: img.naturalHeight });
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        try {
          setBusy(true);
          const mod = await ensureDetector();

          const result = await mod.detectFaces(
            img,
            img.naturalWidth,
            img.naturalHeight,
            { tiled: true },
          );
          const tracked: TrackedFace[] = result.map((f, i) => ({
            ...f,
            id: i + 1,
          }));
          facesRef.current = tracked;
          const km: Record<number, boolean> = {};
          tracked.forEach((f) => (km[f.id] = false));
          keepRef.current = km;
          setKeepMap(km);
          setFaces(tracked);
          setOverlay(tracked.map((f) => ({ id: f.id, box: f })));
          renderImage();
          if (tracked.length === 0) toast.info("No faces detected.");
        } catch {
          toast.error("Failed to run the detector.");
        } finally {
          setBusy(false);
        }
      };
      img.src = url;
    },
    [ensureDetector, renderImage],
  );

  const handleVideo = useCallback(
    async (url: string) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      v.src = url;
      videoRef.current = v;

      v.onloadedmetadata = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        setSize({ w: v.videoWidth, h: v.videoHeight });
        try {
          setBusy(true);
          const mod = await ensureDetector();
          setScanFaces(0);

          abortRef.current = new AbortController();
          const { trajectories, step } = await scanVideo({
            duration: v.duration,
            seek: seekVideo,
            detect: () => mod.detectFaces(v, canvas.width, canvas.height),
            onProgress: setScanProgress,
            onFaces: setScanFaces,
            signal: abortRef.current.signal,
          });
          trajRef.current = trajectories;
          stepRef.current = step;
          const panelFaces: TrackedFace[] = trajectories.map((tr) => ({
            ...tr.best.box,
            id: tr.id,
            score: tr.best.score,
          }));
          facesRef.current = panelFaces;
          const km: Record<number, boolean> = {};
          panelFaces.forEach((f) => (km[f.id] = false));
          keepRef.current = km;
          setKeepMap(km);
          setFaces(panelFaces);
          await seekVideo(0);
          stopLoop();
          videoLoop();
          if (panelFaces.length === 0) toast.info("No faces detected.");
        } catch {
          toast.error("Failed to scan the video.");
        } finally {
          setBusy(false);
        }
      };
    },
    [ensureDetector, seekVideo, stopLoop, videoLoop],
  );

  const onFile = useCallback(
    (file: File) => {
      reset();
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      if (file.type.startsWith("video/")) {
        setMediaType("video");
        handleVideo(url);
      } else {
        setMediaType("image");
        handleImage(url);
      }
    },
    [handleImage, handleVideo, reset],
  );

  const toggleKeep = useCallback((id: number) => {
    setKeepMap((prev) => {
      const next = { ...prev, [id]: !(prev[id] ?? false) };
      keepRef.current = next;
      return next;
    });
  }, []);

  const setAllKeep = useCallback((keep: boolean) => {
    setKeepMap(() => {
      const next: Record<number, boolean> = {};
      facesRef.current.forEach((f) => (next[f.id] = keep));
      keepRef.current = next;
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (mediaType === "image") {
      renderImage();
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, "redacted.png");
      }, "image/png");
      toast.success("Redacted image downloaded.");
      return;
    }

    const v = videoRef.current;
    if (!v) return;
    const exp = await import("@/lib/redactor/videoExport");
    if (!exp.isVideoExportSupported()) {
      toast.error("Video export needs a Chromium-based browser (WebCodecs).");
      return;
    }
    v.pause();
    setPlaying(false);
    stopLoop();
    setExporting(true);
    setExportProgress(0);
    try {
      const window = stepRef.current * 1.75;
      const blob = await exp.exportRedactedVideo({
        video: v,
        width: canvas.width,
        height: canvas.height,
        fps: 25,
        options: optionsRef.current,
        getFrameFaces: (t) =>
          boxesAt(trajRef.current, t, window).map((b) => ({
            ...b.box,
            keep: keepRef.current[b.id] ?? false,
          })),
        onProgress: setExportProgress,
      });
      downloadBlob(blob, "redacted.mp4");
      toast.success("Redacted video downloaded (no audio track).");
    } catch (err) {
      console.error(err);
      toast.error("Video export failed.");
    } finally {
      setExporting(false);
      await seekVideo(0);
      videoLoop();
    }
  }, [mediaType, renderImage, seekVideo, stopLoop, videoLoop]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: ingestion / canvas */}
      <div className="space-y-6 lg:col-span-2">
        {!mediaType ? (
          <>
            <Dropzone onFile={onFile} />
            <PrivacyBadge online={online} />
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <StatusBar
                modelStatus={modelStatus}
                provider={provider}
                faceCount={faces.length}
                busy={busy}
              />
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="size-4" /> New file
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border bg-secondary shadow-sm">
              <div
                className="relative mx-auto"
                style={{
                  aspectRatio: size.w && size.h ? `${size.w}/${size.h}` : "16/9",
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 size-full object-contain"
                />
                {/* clickable face overlays */}
                {size.w > 0 &&
                  overlay.map((o) => {
                    const keep = keepMap[o.id] ?? false;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggleKeep(o.id)}
                        title={keep ? "Click to redact" : "Click to keep visible"}
                        className={cn(
                          "absolute flex items-start justify-start border-2 transition-colors",
                          keep
                            ? "border-success bg-success/10"
                            : "border-primary bg-primary/5",
                        )}
                        style={{
                          left: `${(o.box.x / size.w) * 100}%`,
                          top: `${(o.box.y / size.h) * 100}%`,
                          width: `${(o.box.w / size.w) * 100}%`,
                          height: `${(o.box.h / size.h) * 100}%`,
                        }}
                      >
                        <span
                          className={cn(
                            "mono -translate-y-full px-1 text-[10px] font-bold",
                            keep
                              ? "bg-success text-success-foreground"
                              : "bg-primary text-primary-foreground",
                          )}
                        >
                          {o.id}
                        </span>
                      </button>
                    );
                  })}

                {busy && (
                  <ScanOverlay
                    mode={mediaType === "video" ? "video" : "image"}
                    progress={scanProgress}
                    found={scanFaces}
                  />
                )}

                {!busy && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-scanline bg-primary/70" />
                )}
              </div>
            </div>

            {mediaType === "video" && !busy && (
              <div className="flex items-center gap-3">
                <Button size="sm" variant="secondary" onClick={togglePlay}>
                  {playing ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {playing ? "Pause" : "Play"}
                </Button>
                <p className="mono text-xs text-muted-foreground">
                  Click a face box to toggle redact / keep
                </p>
              </div>
            )}

            {exporting && (
              <div className="space-y-1">
                <div className="mono flex justify-between text-xs text-muted-foreground">
                  <span>Encoding redacted video…</span>
                  <span>{Math.round(exportProgress * 100)}%</span>
                </div>
                <Progress value={exportProgress * 100} className="h-1" />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleExport}
              disabled={busy || exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download redacted {mediaType === "video" ? "video" : "image"}
            </Button>
          </div>
        )}
      </div>

      {/* Right: controls + faces */}
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight">
              <RefreshCw className="size-4 text-primary" /> Redaction
            </h2>
            <span className="mono rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Global
            </span>
          </div>
          <div className="p-5">
            <RedactionControls options={options} onChange={setOptions} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="p-5">
            <FaceSelectionPanel
              faces={faces}
              keepMap={keepMap}
              onToggle={toggleKeep}
              onSetAll={setAllKeep}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
