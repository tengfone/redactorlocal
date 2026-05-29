import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Cpu, Lock, Github } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { RedactorWorkspace } from "@/components/redactor/RedactorWorkspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Redactor — 100% Private, In-Browser Face Redaction" },
      {
        name: "description",
        content:
          "Blur, pixelate or black out faces in images and video. Runs entirely on your device GPU with ONNX Runtime Web — nothing is ever uploaded.",
      },
      { property: "og:title", content: "Redactor — Private Media Redaction" },
      {
        property: "og:description",
        content:
          "AI face redaction that runs 100% in your browser. Turn off your Wi-Fi and it still works.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 grid-texture opacity-[0.35]" />

      <header className="relative border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              REDACTOR<span className="text-primary">.local</span>
            </span>
          </div>
          <div className="mono hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-primary" /> Client-side inference
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5 text-primary" /> Zero-cloud
            </span>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pt-14 text-center">
        <span className="mono inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] text-muted-foreground">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-primary" />
          ONNX Runtime Web · WebGPU accelerated
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          The private media redactor that{" "}
          <span className="text-glow text-primary">never phones home</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          Drop in a sensitive video or image. An on-device AI model detects every
          face so you can blur, pixelate, or black them out — frame by frame on
          your own GPU. No backend. No uploads. No exceptions.
        </p>
      </section>

      <section className="relative mx-auto max-w-6xl px-5 py-12">
        <RedactorWorkspace />
      </section>

      <section className="relative mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <Lock className="size-5" />,
              title: "Nothing leaves the device",
              body: "Files are decoded and processed in-memory. There is literally no upload endpoint.",
            },
            {
              icon: <Cpu className="size-5" />,
              title: "GPU, not the cloud",
              body: "WebGPU runs the detector frame-by-frame, so heavy video never hits a server.",
            },
            {
              icon: <ShieldCheck className="size-5" />,
              title: "Pick who stays visible",
              body: "Faces are tracked across frames — click any one to keep it un-redacted.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/40 p-5"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-center sm:flex-row sm:text-left">
          <p className="mono text-xs text-muted-foreground">
            Runs offline after first load · model cached in your browser
          </p>
          <span className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
            <Github className="size-3.5" /> Built with ONNX Runtime Web +
            WebCodecs
          </span>
        </div>
      </footer>

      <Toaster />
    </main>
  );
}
