"use client";

/**
 * The floating glass surface every panel is built on. Contrast against
 * the (arbitrary, user-colored) gradient behind it comes from the panel's
 * own translucency + blur, not from the page theme.
 */

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const GlassPanel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function GlassPanel({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-glass-border bg-glass shadow-panel backdrop-blur-2xl backdrop-saturate-150",
          className
        )}
        {...props}
      />
    );
  }
);
