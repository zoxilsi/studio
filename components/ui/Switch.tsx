"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg outline-none",
        "focus-visible:ring-2 focus-visible:ring-focus",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      <span className="text-xs font-medium text-muted">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-transparent bg-ink" : "border-glass-border bg-glass-soft"
        )}
      >
        <motion.span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full shadow-sm",
            checked ? "bg-ink-invert" : "bg-muted"
          )}
          animate={{ left: checked ? 18 : 2 }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 550, damping: 32 }
          }
        />
      </span>
    </button>
  );
}
