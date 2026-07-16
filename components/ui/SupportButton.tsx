"use client";

import { HeartIcon } from "@/components/ui/icons";
import { useUiStore } from "@/store/uiStore";

/**
 * Support pill — the same quiet glass chrome as the GitHub button, so it
 * belongs in the bar. The only flourish is a heart that beats almost
 * imperceptibly; nothing shouts. Opens the support dialog.
 */
export function SupportButton() {
  const setSupportOpen = useUiStore((s) => s.setSupportOpen);

  return (
    <button
      type="button"
      onClick={() => setSupportOpen(true)}
      aria-label="Support this project"
      title="Support"
      className="group hidden md:inline-flex h-8 items-center gap-1.5 rounded-full border border-glass-border bg-glass-soft px-3 text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
    >
      <HeartIcon className="support-heart h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold tracking-tight">Support</span>
    </button>
  );
}
