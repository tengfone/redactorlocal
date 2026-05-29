import { Waves, Grid2x2, Square } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { RedactionMode, RedactionOptions } from "@/lib/redactor/types";

interface RedactionControlsProps {
  options: RedactionOptions;
  onChange: (next: RedactionOptions) => void;
}

const MODES: { value: RedactionMode; label: string; icon: React.ReactNode }[] =
  [
    { value: "blur", label: "Blur", icon: <Waves className="size-4" /> },
    {
      value: "pixelate",
      label: "Pixelate",
      icon: <Grid2x2 className="size-4" />,
    },
    { value: "box", label: "Black box", icon: <Square className="size-4" /> },
  ];

export function RedactionControls({
  options,
  onChange,
}: RedactionControlsProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mono mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Redaction style
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((mode) => {
            const active = options.mode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => onChange({ ...options, mode: mode.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {mode.icon}
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn(options.mode === "box" && "opacity-40")}>
        <div className="mb-2 flex items-center justify-between">
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Intensity
          </p>
          <span className="mono text-xs font-semibold text-foreground">
            {options.strength}%
          </span>
        </div>
        <Slider
          value={[options.strength]}
          min={10}
          max={100}
          step={1}
          disabled={options.mode === "box"}
          onValueChange={([v]) => onChange({ ...options, strength: v })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Region padding
          </p>
          <span className="mono text-xs font-semibold text-foreground">
            {Math.round(options.padding * 100)}%
          </span>
        </div>
        <Slider
          value={[Math.round(options.padding * 100)]}
          min={0}
          max={60}
          step={1}
          onValueChange={([v]) => onChange({ ...options, padding: v / 100 })}
        />
      </div>
    </div>
  );
}
