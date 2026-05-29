import { Cpu, Zap, ScanFace, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutionProvider } from "@/lib/redactor/types";

interface StatusBarProps {
  modelStatus: "idle" | "loading" | "ready" | "error";
  provider: ExecutionProvider | null;
  faceCount: number;
  busy: boolean;
}

function Chip({
  label,
  value,
  tone = "default",
  icon,
  pulse,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "success" | "warning";
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5">
      <span
        className={cn(
          "flex items-center",
          tone === "accent" && "text-primary",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "default" && "text-muted-foreground",
          pulse && "animate-pulse-dot",
        )}
      >
        {icon}
      </span>
      <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "mono text-xs font-semibold",
          tone === "accent" && "text-primary",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function StatusBar({
  modelStatus,
  provider,
  faceCount,
  busy,
}: StatusBarProps) {
  const modelValue =
    modelStatus === "ready"
      ? "READY"
      : modelStatus === "loading"
        ? "LOADING"
        : modelStatus === "error"
          ? "ERROR"
          : "STANDBY";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        label="Engine"
        value={modelValue}
        icon={
          modelStatus === "loading" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Cpu className="size-3.5" />
          )
        }
        tone={
          modelStatus === "ready"
            ? "success"
            : modelStatus === "error"
              ? "warning"
              : "default"
        }
        pulse={modelStatus === "loading"}
      />
      <Chip
        label="Backend"
        value={provider ? provider.toUpperCase() : "—"}
        icon={<Zap className="size-3.5" />}
        tone={provider === "webgpu" ? "accent" : "default"}
      />
      <Chip
        label="Faces"
        value={String(faceCount)}
        icon={<ScanFace className="size-3.5" />}
        tone={faceCount > 0 ? "accent" : "default"}
      />
      {busy && (
        <Chip
          label="Status"
          value="WORKING"
          icon={<Loader2 className="size-3.5 animate-spin" />}
          tone="warning"
          pulse
        />
      )}
    </div>
  );
}
