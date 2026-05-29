# Plan: "Zero-Cloud" Private Media Redactor

A fully client-side app that detects and redacts faces in images and video using ONNX Runtime Web — no backend, no upload, GPU-accelerated frame-by-frame. Users can pick the redaction style and **click individual faces to keep them visible (unblur)**. Styled like a serious AI-lab SaaS.

## Core principle
Everything runs in the browser. No Lovable Cloud, no server media handling — media never leaves the device. The "Turn off your Wi-Fi" badge is literally true: after first load, the model + runtime are cached and processing works offline.

## Tech approach

**Detection**
- `onnxruntime-web` with WebGPU execution provider, falling back to WASM (SIMD/threads).
- Model: small YOLO-style face detector (`yolov8n-face`, ~6MB ONNX) in `public/models/`. ORT wasm in `public/ort/` via `ort.env.wasm.wasmPaths` (never bundled into SSR).
- All ORT code client-only: dynamically imported after hydration, guarded by `typeof window`, never imported from any `.server`/route-loader path. Heavy work runs in a Web Worker.

**Redaction (user-selectable)**
- Three modes: Gaussian blur, Pixelate (mosaic), Solid black box — toggled live per detected box.
- Adjustable padding/strength slider so redaction fully covers each face.

**Per-face unblur selection (new)**
- Each detected face gets a stable ID and a numbered, clickable bounding box on the overlay.
- Default = all faces redacted. Clicking a box toggles it to "keep visible"; a side list shows every face with a thumbnail + redact/keep toggle and a "redact all / keep all" control.
- For video: faces are tracked across frames via IoU matching so a "keep visible" choice persists for the same person across frames (with a re-detect tolerance). A simple per-frame override is available if tracking drifts.

**Images**
- Decode to canvas → detect once → user adjusts which faces to keep → composite redaction → export PNG/JPG.

**Video**
- Decode frames via `<video>` + `requestVideoFrameCallback`, detect per frame, track faces, composite redaction on offscreen canvas, live preview + progress/scrub bar.
- Export: re-encode redacted frames with WebCodecs `VideoEncoder` muxed to MP4 via `mp4-muxer`; original audio muxed back when present. Graceful notice if WebCodecs is unavailable (Chromium recommended).

## Pages / structure
- `src/routes/index.tsx` — landing + tool (single page). AI-lab hero, big **"100% Private — Turn off your Wi-Fi to test"** badge, live status chips (provider WebGPU/WASM, model loaded, offline-ready, faces detected).
- Dropzone → workspace: preview canvas with numbered face overlays, face-selection side panel, redaction-mode controls, strength slider, Process + Download, video progress.
- Components: `Dropzone`, `RedactorWorkspace`, `PrivacyBadge`, `DetectionStatusBar`, `RedactionControls`, `FaceSelectionPanel`, `ModelLoader`.
- Lib/hooks: `useFaceDetector` (ORT session + inference), `faceTracker.ts` (IoU tracking across frames), `redaction.ts` (blur/pixelate/box canvas ops), `videoExport.ts` (WebCodecs + mp4-muxer), `detector.client.ts` (model load + provider selection).

## Design (AI-lab SaaS)
- Dark technical palette in `src/styles.css` (oklch tokens): near-black bg, cool off-white text, one restrained accent (electric teal/cyan), hairline borders, subtle grid texture.
- Typography: geometric sans for UI + monospace for technical readouts (provider, FPS, faces, model hash).
- Restrained motion: canvas scan-line/detection animation, status chips. Precise spacing, real data readouts, hardware-status feel.

## Technical notes
- Add deps: `onnxruntime-web`, `mp4-muxer`. Copy ORT `.wasm` + model into `public/`.
- No Lovable Cloud, no server-side media. SSR-safe: all WASM/WebGPU/WebCodecs code dynamically imported in client-only effects.
- SEO: unique title/description, single H1.

## Scope / caveats
- Faces only. Plates/documents are a later add.
- WebCodecs video export is best in Chromium; Safari/Firefox get image export + live preview with a clear notice.
- First load downloads the model (~6MB) once, then fully offline-capable.
- Cross-frame "keep visible" relies on IoU tracking; rapid motion/occlusion may need a manual re-toggle.
