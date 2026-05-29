import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrackedFace } from "@/lib/redactor/types";

interface FaceSelectionPanelProps {
  faces: TrackedFace[];
  keepMap: Record<number, boolean>;
  onToggle: (id: number) => void;
  onSetAll: (keep: boolean) => void;
}

export function FaceSelectionPanel({
  faces,
  keepMap,
  onToggle,
  onSetAll,
}: FaceSelectionPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Detected faces · {faces.length}
        </p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSetAll(false)}
          >
            Redact all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onSetAll(true)}
          >
            Keep all
          </Button>
        </div>
      </div>

      {faces.length === 0 ? (
        <p className="mono rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          No faces detected yet.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {faces.map((face) => {
            const keep = keepMap[face.id] ?? false;
            return (
              <li key={face.id}>
                <button
                  type="button"
                  onClick={() => onToggle(face.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                    keep
                      ? "border-success/40 bg-success/10"
                      : "border-primary/40 bg-primary/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold",
                      keep
                        ? "bg-success/20 text-success"
                        : "bg-primary/20 text-primary",
                    )}
                  >
                    {face.id}
                  </span>
                  <span className="flex-1">
                    <span className="mono block text-xs font-semibold text-foreground">
                      {keep ? "Visible" : "Redacted"}
                    </span>
                    <span className="mono block text-[10px] text-muted-foreground">
                      {Math.round(face.score * 100)}% conf
                    </span>
                  </span>
                  {keep ? (
                    <Eye className="size-4 text-success" />
                  ) : (
                    <EyeOff className="size-4 text-primary" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
