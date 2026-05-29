import { ScanFace } from "lucide-react";

interface ScanOverlayProps {
  /** "image" runs a one-shot detection, "video" a multi-frame scan. */
  mode: "image" | "video";
  /** True while the AI engine is still warming up (first load). */
  engineLoading?: boolean;
  /** 0 - 1 progress for video scans. */
  progress?: number;
  /** Faces found so far (shown live during video scans). */
  found?: number;
}

/**
 * AI-lab style processing overlay rendered directly on top of the media:
 * a sweeping scan band, drifting grid, corner brackets and a live readout.
 */
export function ScanOverlay({
  mode,
  engineLoading = false,
  progress = 0,
  found = 0,
}: ScanOverlayProps) {
  const pct = Math.round(progress * 100);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* dim + drifting grid */}
      <div className="absolute inset-0 bg-background/55 backdrop-blur-[2px]" />
      <div className="grid-texture animate-grid-drift absolute inset-0 opacity-40" />

      {/* sweeping scan band */}
      <div className="animate-scan-sweep absolute inset-x-0 h-[14%]">
        <div
          className="size-full"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--primary) 22%, transparent), transparent)",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-primary shadow-[0_0_12px_2px_var(--color-primary)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-primary/40" />
      </div>

      {/* corner brackets */}
      {[
        "left-3 top-3 border-l-2 border-t-2",
        "right-3 top-3 border-r-2 border-t-2",
        "left-3 bottom-3 border-b-2 border-l-2",
        "right-3 bottom-3 border-b-2 border-r-2",
      ].map((pos) => (
        <span
          key={pos}
          className={`absolute size-7 rounded-[3px] border-primary/70 ${pos}`}
        />
      ))}

      {/* centre readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative flex size-14 items-center justify-center rounded-full border border-primary/40 bg-card/70">
          <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
          <ScanFace className="size-6 text-primary" />
        </div>

        <div className="space-y-1">
          <p className="mono text-sm font-semibold tracking-wide text-foreground">
            {mode === "video" ? "ANALYZING FRAMES" : "DETECTING FACES"}
          </p>
          <p className="mono text-[11px] text-primary">
            {mode === "video"
              ? `${pct}% · ${found} ${found === 1 ? "face" : "faces"} tracked`
              : "Running multi-scale inference on your GPU"}
          </p>
        </div>

        {mode === "video" && (
          <div className="mt-1 h-1 w-52 overflow-hidden rounded-full bg-secondary/70">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <p className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          On-device · nothing uploaded
        </p>
      </div>
    </div>
  );
}
