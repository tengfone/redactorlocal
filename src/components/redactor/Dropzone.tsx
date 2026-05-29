import { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, Film } from "lucide-react";
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
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
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
        "group relative flex w-full flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
        dragging
          ? "border-primary bg-primary/10"
          : "border-border bg-card/40 hover:border-primary/50",
      )}
    >
      <div className="pointer-events-none absolute inset-0 grid-texture opacity-30" />
      <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <UploadCloud className="size-8" />
      </div>
      <div className="relative space-y-1.5">
        <p className="text-lg font-semibold text-foreground">
          Drop an image or video to redact
        </p>
        <p className="mono text-xs text-muted-foreground">
          Processed locally on your device · never uploaded
        </p>
      </div>
      <div className="relative flex items-center gap-3 text-muted-foreground">
        <span className="mono flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[10px]">
          <ImageIcon className="size-3.5" /> JPG · PNG · WEBP
        </span>
        <span className="mono flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-[10px]">
          <Film className="size-3.5" /> MP4 · WEBM · MOV
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </button>
  );
}
