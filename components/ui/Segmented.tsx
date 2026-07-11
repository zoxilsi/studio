"use client";

/**
 * Segmented control with a spring-animated active pill (shared layout).
 */

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded-full border border-glass-border bg-glass-soft p-0.5"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative flex-1 cursor-pointer rounded-full px-2 py-1 text-[11px] font-medium outline-none transition-colors duration-150",
                "focus-visible:ring-2 focus-visible:ring-focus",
                active ? "text-ink" : "text-faint hover:text-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full bg-hover shadow-sm"
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 35 }
                  }
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
