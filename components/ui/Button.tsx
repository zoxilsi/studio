"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "icon";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  active?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-ink-invert shadow-lift hover:opacity-90",
  ghost:
    "text-muted hover:text-ink hover:bg-hover",
  outline:
    "border border-glass-border bg-glass-soft text-ink hover:bg-hover",
  danger:
    "text-muted hover:text-red-400 hover:bg-red-500/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-9 gap-2 px-4 text-[13px]",
  icon: "h-8 w-8 shrink-0",
};

/**
 * Note: props must be identical on server and client — reduced-motion
 * handling lives in the app-level <MotionConfig reducedMotion="user">,
 * never in conditional props (that breaks hydration: framer adds
 * tabindex for whileTap elements).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "ghost", size = "md", active, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex cursor-pointer select-none items-center justify-center rounded-full font-medium tracking-tight outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-0",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        active && "bg-hover text-ink",
        className
      )}
      {...props}
    />
  );
});

/** Type-safe alias used where plain button semantics are clearer. */
export type NativeButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
