"use client";

/**
 * Color input: swatch → full picker popover (SV square + hue strip +
 * eyedropper) plus a validated hex text field. HSV state lives locally
 * while picking so hue survives trips through black/white/gray.
 */

import { useEffect, useRef, useState } from "react";
import { hexToRgb, rgbToHex, isValidHex } from "@/lib/color";
import { cn } from "@/lib/utils";

interface ColorFieldProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  onCommitStart?: () => void;
  className?: string;
}

/* ------------------------------ hsv helpers ------------------------------ */

function hexToHsv(hex: string): [number, number, number] {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return rgbToHex({ r: f(5), g: f(3), b: f(1) });
}

/* ------------------------------- component ------------------------------- */

export function ColorField({ label, value, onChange, onCommitStart, className }: ColorFieldProps) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  const gestureCommitted = useRef(false);
  const picking = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  // Sync HSV from outside changes, but never mid-gesture (keeps hue stable).
  useEffect(() => {
    if (!picking.current && hsvToHex(...hexToHsv(value)) !== hsvToHex(...hsv)) {
      setHsv(hexToHsv(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const beginGesture = () => {
    if (!gestureCommitted.current) {
      gestureCommitted.current = true;
      onCommitStart?.();
    }
  };

  const commitDraft = () => {
    gestureCommitted.current = false;
    if (!isValidHex(draft)) {
      setDraft(value);
      return;
    }
    const hex = draft.startsWith("#") ? draft : `#${draft}`;
    if (hex.toLowerCase() !== value.toLowerCase()) {
      onCommitStart?.();
      onChange(hex.toLowerCase());
    }
  };

  const apply = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    onChange(hsvToHex(h, s, v));
  };

  /** Shared drag plumbing for the SV square and hue strip. */
  const dragArea = (update: (nx: number, ny: number) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      picking.current = true;
      beginGesture();
      const r = e.currentTarget.getBoundingClientRect();
      update(
        Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      );
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!picking.current) return;
      const r = e.currentTarget.getBoundingClientRect();
      update(
        Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
        Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
      );
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      picking.current = false;
      gestureCommitted.current = false;
    },
  });

  const [h, s, v] = hsv;
  const hueColor = hsvToHex(h, 1, 1);

  const eyedrop = async () => {
    // Chromium-only EyeDropper API; quietly unavailable elsewhere.
    const ED = (window as unknown as { EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper;
    if (!ED) return;
    try {
      beginGesture();
      const res = await new ED().open();
      onChange(res.sRGBHex.toLowerCase());
      gestureCommitted.current = false;
    } catch {
      /* cancelled */
    }
  };

  return (
    <div ref={rootRef} className={cn("relative flex flex-col gap-1.5", className)}>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={label ? `${label} color picker` : "Color picker"}
          aria-expanded={open}
          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-glass-border shadow-sm outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-focus"
          style={{ backgroundColor: isValidHex(value) ? value : "#000000" }}
          onClick={() => setOpen((o) => !o)}
        />
        <input
          type="text"
          value={draft.toUpperCase()}
          spellCheck={false}
          aria-label={label ? `${label} hex value` : "Hex value"}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-glass-border bg-glass-soft px-2.5 font-mono text-[11px] uppercase tracking-wide text-ink outline-none",
            "focus-visible:ring-2 focus-visible:ring-focus",
            !isValidHex(draft) && "text-red-400"
          )}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(value);
          }}
        />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-glass-border bg-glass p-2.5 shadow-lift backdrop-blur-2xl">
          {/* Saturation / value square */}
          <div
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuetext={`saturation ${Math.round(s * 100)}%, brightness ${Math.round(v * 100)}%`}
            className="relative h-36 w-full cursor-crosshair touch-none rounded-lg"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            {...dragArea((nx, ny) => apply(h, nx, 1 - ny))}
          >
            <span
              className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
              style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, backgroundColor: value }}
            />
          </div>

          {/* Hue strip + eyedropper */}
          <div className="mt-2.5 flex items-center gap-2">
            <div
              role="slider"
              aria-label="Hue"
              aria-valuetext={`${Math.round(h)} degrees`}
              className="relative h-3.5 flex-1 cursor-ew-resize touch-none rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
              }}
              {...dragArea((nx) => apply(nx * 360, s, v))}
            >
              <span
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                style={{ left: `${(h / 360) * 100}%`, backgroundColor: hueColor }}
              />
            </div>
            <button
              type="button"
              aria-label="Pick color from screen"
              onClick={eyedrop}
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-glass-border bg-glass-soft text-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-focus"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m2 22 1-4 9.5-9.5 3 3L6 21zM14.5 5.5l2-2a2.1 2.1 0 0 1 3 3l-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
