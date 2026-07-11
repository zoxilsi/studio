"use client";

/**
 * Collapsible inspector section with smooth height animation.
 */

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronIcon } from "./icons";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduced = useReducedMotion();

  return (
    <div className="border-b border-glass-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-4 py-3 outline-none transition-colors",
          "hover:bg-hover/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
          className="text-faint"
        >
          <ChevronIcon />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3.5 px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
