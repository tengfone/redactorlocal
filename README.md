# Redactor.local

**100% private, in-browser face redaction for images and video.**

Drop in a sensitive photo or clip and an on-device AI model detects every face so
you can **blur**, **pixelate**, or **black them out** — frame by frame, entirely on
your own GPU. No backend, no uploads, no accounts. Turn off your Wi-Fi and it still
works.

🔗 **Live app:** https://redactorlocal.lovable.app
📦 **Source:** https://github.com/tengfone/redactorlocal

---

## Why it exists

Most "blur a face" tools quietly upload your media to a server. For anything
sensitive — leaked footage, medical images, journalistic source protection, KYC
documents — that's a non-starter. Redactor.local does all detection and rendering
in the browser, so your files never leave your device.

- **Zero-cloud** — inference runs locally via [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/).
- **Offline-capable** — after the model is cached on first load, it works with no network.
- **GPU-accelerated** — uses **WebGPU** where available, with a **WASM** fallback.
- **Image & video** — stills export as PNG; video is re-encoded client-side via WebCodecs + `mp4-muxer`.

---

## Features

- Drag-and-drop ingestion for images and video.
- **SCRFD-2.5G** face detector (InsightFace) — a lightweight (~3.3 MB) anchor-based
  model that handles crowds, masked faces, and small/distant faces well.
- Per-face control: click any detected face box to toggle **redact** vs **keep visible**.
- Three redaction modes — **blur**, **pixelate**, **box** — with adjustable strength and padding.
- Live face tracking across video frames with a multi-frame scan.
- One-click export: redacted **PNG** (images) or **MP4** (video, Chromium/WebCodecs).
- AI-lab style scan overlay that shows engine warm-up and detection progress directly on the media.

---

## Tech stack

| Area            | Choice                                                        |
| --------------- | ------------------------------------------------------------ |
| Framework       | [TanStack Start](https://tanstack.com/start) v1 (React 19, SSR-capable) |
| Build tool      | Vite 7                                                        |
| Routing         | TanStack Router (file-based, `src/routes/`)                  |
| Styling         | Tailwind CSS v4 (tokens in `src/styles.css`, `oklch` colors) |
| UI primitives   | shadcn/ui + Radix                                            |
| ML runtime      | `onnxruntime-web` (WebGPU + WASM)                            |
| Video export    | WebCodecs + `mp4-muxer`                                      |
| Icons / toasts  | `lucide-react`, `sonner`                                     |

---

## Project structure

```text
src/
├── routes/
│   ├── __root.tsx          # HTML shell, head/meta, providers
│   ├── index.tsx           # Dashboard layout + landing copy
│   └── sitemap[.]xml.ts    # Generated sitemap
├── components/redactor/
│   ├── RedactorWorkspace.tsx   # Orchestrates ingestion, detection, rendering, export
│   ├── Dropzone.tsx            # File ingestion UI
│   ├── ScanOverlay.tsx         # On-media engine-load / detection overlay
│   ├── StatusBar.tsx           # Engine / backend / face-count chips
│   ├── RedactionControls.tsx   # Mode, strength, padding controls
│   ├── FaceSelectionPanel.tsx  # Per-face keep/redact list
│   └── PrivacyBadge.tsx        # "Runs 100% on your device" callout
├── lib/redactor/
│   ├── detector.runtime.ts # SCRFD-2.5G ONNX session + decoding (client-only)
│   ├── scan.ts             # Multi-frame video scan + face trajectories
│   ├── faceTracker.ts      # Frame-to-frame face association
│   ├── redaction.ts        # Canvas blur / pixelate / box rendering
│   ├── videoExport.ts      # WebCodecs encode + MP4 mux
│   └── types.ts            # Shared types & defaults
└── styles.css              # Design tokens & theme
public/
└── models/scrfd_2.5g.onnx  # Face detection model (cached after first load)
```

---

## Running locally

```bash
# install (bun recommended; npm/pnpm also work)
bun install

# start the dev server
bun run dev

# production build
bun run build
```

> **Note:** WebGPU requires a recent Chromium-based browser. Video **export**
> specifically needs WebCodecs (also Chromium). Detection itself falls back to
> WASM in browsers without WebGPU.

---

## How privacy is enforced

There is no server-side media handling by design:

- The detector module is **dynamically imported on the client only** and runs
  inference in the browser.
- Files are read into in-memory object URLs (`URL.createObjectURL`) — never POSTed anywhere.
- The model file is served as a static asset and cached by the browser, enabling offline use.

---

## How this was built (Lovable + system prompt)

This project was built end-to-end with [**Lovable**](https://lovable.dev), an AI
agent that writes and edits the application directly while the user watches a live
preview. The sections below document the prompts and template scaffolding that
shaped the codebase, for transparency and reproducibility.

### Starting template

Lovable scaffolds new apps from a fixed **TanStack Start** template, not a blank
folder. The template defines hard architectural constraints the agent must respect:

- **TanStack Start v1** on **Vite 7**, **React 19**, targeting an edge (Cloudflare
  Workers) runtime.
- **File-based routing** under `src/routes/`; the route tree (`routeTree.gen.ts`)
  is auto-generated — never hand-edited.
- Bootstrap shell is fixed: `src/router.tsx`, `src/routes/__root.tsx`,
  `src/routes/index.tsx`. The root layout always lives in `__root.tsx`.
- **Tailwind CSS v4** configured through `src/styles.css` (native `@import` +
  `@theme` tokens in `oklch`), not a legacy `tailwind.config.js`.
- shadcn/ui + Radix component library pre-wired.
- Optional **Lovable Cloud** (managed Supabase) for database/auth/storage — *not*
  used here, since the entire app is intentionally client-side.

### System-prompt rules that shaped this app

The agent operates under a detailed system prompt. The rules most visible in this
codebase:

- **Design system first** — never hard-code colors in components; use semantic
  tokens (`--background`, `--primary`, etc.) defined in `src/styles.css`. The
  Cloud White palette and Space Grotesk / DM Sans typography were chosen via
  guided design-preference questions.
- **Server runtime awareness** — the edge Worker runtime can't run native modules
  (`sharp`, `canvas`, `puppeteer`, `child_process`). This is a key reason all ML
  work runs in the **browser** via `onnxruntime-web` rather than server-side.
- **Strict build** — every import must resolve before build; files are created
  before they're imported.
- **SEO defaults** — per-route `head()` metadata, `robots.txt`, `sitemap.xml`,
  semantic HTML, single H1.
- **Surgical edits** — the agent prefers targeted search/replace over full-file
  rewrites and only touches what each request asks for.

### Representative prompts used during development

The app was shaped through an iterative chat. A condensed timeline of the actual
user prompts:

1. *"Save this whole thing into my GitHub connection as a new repo."*
2. *"List the failing SEO findings and fix them."* → added `llms.txt`,
   `robots.txt`, `sitemap.xml`, and route-level meta.
3. *"Load the security issues from the scan results and fix them."* → removed an
   unused example server function.
4. *"/redesign — I don't like this layout and UI."* → guided palette / typography /
   layout selection (Cloud White · Space Grotesk + DM Sans · Dashboard), then a
   "Dense utility command center" direction, rebuilt as the current dashboard shell.
5. *"What's 'JD' top-right? Add a footer linking the GitHub repo, and improve the
   image-load UX with an overlay showing the engine loading."*

> These prompts are paraphrased for readability. The defining trait of the workflow
> is **conversational, incremental refinement** — each request produced a focused,
> verifiable change rather than a big-bang rewrite.

---

## License

See the repository for license details.

---

*Built with [Lovable](https://lovable.dev) · ONNX Runtime Web · WebCodecs · TanStack Start.*
