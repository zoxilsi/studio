"use client";

/**
 * Export hub: raster images at any resolution (exact offscreen re-render
 * of the two-pass pipeline), WebM video captured from the live artboard,
 * code formats, and zoxilsi studio project files (export + import).
 */

import { useMemo, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { CheckIcon, CopyIcon, DownloadIcon, FilmIcon } from "@/components/ui/icons";
import { engine } from "@/lib/engine";
import {
  copyText,
  downloadBlob,
  downloadText,
  exportCss,
  exportHtml,
  exportJson,
  exportReact,
  exportSvg,
  exportTailwind,
  parseImportedJson,
  renderImageBlob,
  renderVideoBlob,
} from "@/lib/export";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";
import { clamp } from "@/lib/utils";

const TABS = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "code", label: "Code" },
] as const;

const IMG_FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "webp", label: "WebP" },
] as const;

const SIZES = [
  { label: "4000×3000", w: 4000, h: 3000 },
  { label: "Full HD", w: 1920, h: 1080 },
  { label: "4K", w: 3840, h: 2160 },
  { label: "Square 2048", w: 2048, h: 2048 },
  { label: "Portrait 4k", w: 2160, h: 3840 }
];

const DURATIONS = [
  { value: "3", label: "3s" },
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
  { value: "20", label: "20s" },
] as const;

const VIDEO_SIZES = [
  { value: "1080", label: "1080p", w: 1920, h: 1080 },
  { value: "1440", label: "1440p", w: 2560, h: 1440 },
  { value: "2160", label: "4K", w: 3840, h: 2160 },
  { value: "square", label: "Square", w: 2160, h: 2160 },
] as const;

const VIDEO_FPS = [
  { value: "30", label: "30 fps" },
  { value: "60", label: "60 fps" },
] as const;

const CODE_FORMATS = [
  { value: "json", label: "Project" },
  { value: "css", label: "CSS" },
  { value: "tailwind", label: "Tailwind" },
  { value: "react", label: "React" },
  { value: "svg", label: "SVG" },
  { value: "html", label: "HTML" },
] as const;

type CodeFormat = (typeof CODE_FORMATS)[number]["value"];

export function ExportDialog() {
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const doc = useMeshStore((s) => s.doc);
  const applyDoc = useMeshStore((s) => s.applyDoc);

  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("image");
  const [format, setFormat] = useState<(typeof IMG_FORMATS)[number]["value"]>("png");
  const [width, setWidth] = useState(4000);
  const [height, setHeight] = useState(3000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState<(typeof DURATIONS)[number]["value"]>("5");
  const [videoSize, setVideoSize] = useState<(typeof VIDEO_SIZES)[number]["value"]>("2160");
  const [videoFps, setVideoFps] = useState<(typeof VIDEO_FPS)[number]["value"]>("60");
  const [recProgress, setRecProgress] = useState<number | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [codeFormat, setCodeFormat] = useState<CodeFormat>("json");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    switch (codeFormat) {
      case "json": return exportJson(doc);
      case "css": return exportCss(doc);
      case "tailwind": return exportTailwind(doc);
      case "react": return exportReact(doc);
      case "svg": return exportSvg(doc);
      case "html": return exportHtml(doc);
    }
  }, [codeFormat, doc]);

  const exportImage = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderImageBlob(
        doc,
        engine.time,
        {
          width: clamp(Math.round(width) || 4000, 16, 8192),
          height: clamp(Math.round(height) || 3000, 16, 8192),
          format,
        },
        engine.flowTime
      );
      downloadBlob(blob, `studio-gradient.${format}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    const seconds = Number(duration);
    const size = VIDEO_SIZES.find((s) => s.value === videoSize) ?? VIDEO_SIZES[2];
    try {
      const rec = renderVideoBlob(
        doc,
        { width: size.w, height: size.h, fps: Number(videoFps), seconds },
        { time: engine.time, flowTime: engine.flowTime }
      );
      stopRef.current = rec.stop;
      setRecProgress(0);
      const started = performance.now();
      const timer = window.setInterval(() => {
        setRecProgress(Math.min(1, (performance.now() - started) / (seconds * 1000)));
      }, 100);
      const blob = await rec.done;
      window.clearInterval(timer);
      setRecProgress(null);
      stopRef.current = null;
      const ext = rec.mimeType.includes("mp4") ? "mp4" : "webm";
      downloadBlob(blob, `studio-gradient-${size.label.toLowerCase()}.${ext}`);
    } catch (err) {
      setRecProgress(null);
      setError(err instanceof Error ? err.message : "Recording failed.");
    }
  };

  const importProject = async (file: File) => {
    setError(null);
    try {
      applyDoc(parseImportedJson(await file.text()));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const codeExt: Record<CodeFormat, string> = {
    json: "studio.json",
    css: "css",
    tailwind: "html",
    react: "tsx",
    svg: "svg",
    html: "html",
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Export">
      <div className="flex flex-col gap-5">
        <Segmented label="Format" options={TABS} value={tab} onChange={setTab} />

        {tab === "image" && (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Resolution</span>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((s) => (
                  <Button
                    key={s.label}
                    size="sm"
                    variant="outline"
                    active={width === s.w && height === s.h}
                    onClick={() => {
                      setWidth(s.w);
                      setHeight(s.h);
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
              <div className="mt-1 flex items-center gap-2">
                {(
                  [
                    ["Width", width, setWidth],
                    ["Height", height, setHeight],
                  ] as const
                ).map(([label, value, set]) => (
                  <label key={label} className="flex flex-1 flex-col gap-1">
                    <span className="text-[10px] text-faint">{label}</span>
                    <input
                      type="number"
                      min={16}
                      max={8192}
                      value={value}
                      onChange={(e) => set(Number(e.target.value))}
                      className="h-8 w-full rounded-lg border border-glass-border bg-glass-soft px-2.5 font-mono text-[11px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                  </label>
                ))}
              </div>
            </div>
            <Segmented label="Choose format" options={IMG_FORMATS} value={format} onChange={setFormat} />
            <Button variant="primary" disabled={busy} onClick={exportImage} className="self-start">
              <DownloadIcon />
              {busy ? "Rendering…" : `Download ${format.toUpperCase()}`}
            </Button>
          </>
        )}

        {tab === "video" && (
          <>
            <Segmented label="Resolution" options={VIDEO_SIZES} value={videoSize} onChange={setVideoSize} />
            <div className="flex flex-wrap gap-4">
              <Segmented label="Frame rate" options={VIDEO_FPS} value={videoFps} onChange={setVideoFps} />
              <Segmented label="Duration" options={DURATIONS} value={duration} onChange={setDuration} />
            </div>
            <p className="text-[11px] leading-relaxed text-faint">
              Renders the animation offscreen at the full chosen resolution —
              drift, hue flow and grain all move — and encodes at a bitrate
              matched to the pixel rate, so 4K stays crisp. Keep this tab
              visible while recording.
            </p>
            {recProgress === null ? (
              <Button variant="primary" onClick={startRecording} className="self-start">
                <FilmIcon /> Record {duration}s clip
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-glass-soft">
                  <div
                    className="h-full rounded-full bg-ink transition-[width] duration-100"
                    style={{ width: `${recProgress * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-muted">
                  {Math.round(recProgress * 100)}%
                </span>
                <Button size="sm" variant="outline" onClick={() => stopRef.current?.()}>
                  Stop
                </Button>
              </div>
            )}
          </>
        )}

        {tab === "code" && (
          <>
            <Segmented label="Language" options={CODE_FORMATS} value={codeFormat} onChange={setCodeFormat} />
            <pre className="studio-scroll max-h-60 overflow-auto rounded-xl border border-glass-border bg-glass-soft p-3.5 font-mono text-[11px] leading-relaxed text-muted">
              {code}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  if (await copyText(code)) {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadText(code, `studio-gradient.${codeExt[codeFormat]}`)}
              >
                <DownloadIcon /> Download
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                Import project…
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.zoxilsi,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importProject(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-faint">
              {codeFormat === "json"
                ? "The project file restores the exact editable mesh — colors, curves, effects and animation."
                : "CSS-based formats are a static approximation of the WebGL render. Use the Project format to re-edit the exact gradient."}
            </p>
          </>
        )}

        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    </Dialog>
  );
}
