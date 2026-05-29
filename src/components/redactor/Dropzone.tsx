import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFile: (file: File) => void;
}

export function Dropzone({ onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      onFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "dot-grid relative flex w-full flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UploadCloud className="size-8" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Drop media to redact
        </h2>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Your files never leave your device. All inference runs locally on your
          own GPU via WebGPU.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          Select Files
        </button>
        <span className="mono rounded-lg bg-secondary px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          JPG · PNG · MP4 · WEBM
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
