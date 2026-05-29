import { WifiOff, Wifi, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyBadgeProps {
  online: boolean;
}

export function PrivacyBadge({ online }: PrivacyBadgeProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card/60 px-5 py-4 border-glow">
      <div className="pointer-events-none absolute inset-0 grid-texture opacity-40" />
      <div className="relative flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <div className="flex-1">
          <p className="text-glow text-lg font-bold tracking-tight text-foreground">
            100% Private.{" "}
            <span className="text-primary">Turn off your Wi-Fi to test.</span>
          </p>
          <p className="mono text-xs text-muted-foreground">
            Frames are processed on your GPU. Nothing is ever uploaded — there
            is no server.
          </p>
        </div>
        <div
          className={cn(
            "mono flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium",
            online
              ? "border-border bg-secondary/60 text-muted-foreground"
              : "border-success/40 bg-success/10 text-success",
          )}
        >
          {online ? (
            <>
              <Wifi className="size-3.5" />
              ONLINE
            </>
          ) : (
            <>
              <WifiOff className="size-3.5" />
              OFFLINE · STILL WORKING
            </>
          )}
        </div>
      </div>
    </div>
  );
}
