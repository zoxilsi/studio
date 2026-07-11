"use client";

/**
 * Inspector slider: label + numeric readout + custom-styled range input.
 * History semantics: `onCommitStart` fires once per gesture (pointer-down
 * or the first arrow key in a focus session) so a whole scrub collapses
 * into a single undo step.
 */

import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommitStart?: () => void;
  format?: (value: number) => string;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommitStart,
  format = (v) => v.toFixed(2),
  disabled,
}: SliderProps) {
  const gestureCommitted = useRef(false);

  const beginGesture = () => {
    if (!gestureCommitted.current) {
      gestureCommitted.current = true;
      onCommitStart?.();
    }
  };
  const endGesture = () => {
    gestureCommitted.current = false;
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <label
      className={cn(
        "group flex flex-col gap-1.5",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted transition-colors group-hover:text-ink">
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-faint">
          {format(value)}
        </span>
      </span>
      <input
        type="range"
        className="studio-range"
        style={{ "--fill": `${percent}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onPointerDown={beginGesture}
        onPointerUp={endGesture}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
            beginGesture();
          }
        }}
        onBlur={endGesture}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}
