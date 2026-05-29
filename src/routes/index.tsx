import { createFileRoute } from "@tanstack/react-router";
import {
  ScanFace,
  Layers,
  ShieldCheck,
  WifiOff,
  Lock,
  Github,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { RedactorWorkspace } from "@/components/redactor/RedactorWorkspace";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

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

const NAV = [
  { label: "Redactor", icon: ScanFace, active: true },
  { label: "Batch Tasks", icon: Layers, active: false },
  { label: "Privacy Audit", icon: ShieldCheck, active: false },
];

function Index() {
  const online = useOnlineStatus();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <div className="size-3.5 rounded-sm border-2 border-current" />
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">
            REDACTOR<span className="text-primary">.local</span>
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV.map((item) => (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                item.active
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-6">
          <p className="mono mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Engine Status
          </p>
          <div className="space-y-2">
            <StatusRow label="ONNX Runtime" value="Active" />
            <StatusRow label="WebGPU" value="Accelerated" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-5 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <span
              className={cn(
                "mono flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
                online
                  ? "bg-primary/10 text-primary"
                  : "bg-success/10 text-success",
              )}
            >
              <span
                className={cn(
                  "size-1.5 animate-pulse-dot rounded-full",
                  online ? "bg-primary" : "bg-success",
                )}
              />
              {online ? "ONLINE" : "OFFLINE MODE"}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Zero-cloud local processing
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="mono hidden items-center gap-2 text-xs font-medium text-muted-foreground md:flex">
              <WifiOff className="size-4" /> Network optional
            </span>
            <a
              href="https://github.com/tengfone/redactorlocal"
              target="_blank"
              rel="noreferrer noopener"
              title="View source on GitHub"
              className="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="size-4" />
            </a>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                The private media redactor that{" "}
                <span className="text-primary">never phones home.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Drop a sensitive video or image. An on-device AI model detects
                every face so you can blur, pixelate, or black them out — frame
                by frame on your own GPU. No backend, no uploads.
              </p>
            </div>

            <RedactorWorkspace />

            <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-center sm:flex-row sm:text-left">
              <p className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5" /> Runs offline after first load ·
                model cached in your browser
              </p>
              <a
                href="https://github.com/tengfone/redactorlocal"
                target="_blank"
                rel="noreferrer noopener"
                className="mono flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="size-3.5" /> github.com/tengfone/redactorlocal
              </a>
            </footer>
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-success">
        <span className="size-1.5 rounded-full bg-success" />
        {value}
      </span>
    </div>
  );
}
