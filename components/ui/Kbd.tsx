import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-glass-border bg-glass-soft px-1.5 font-mono text-[10px] font-medium text-muted shadow-[0_1px_0_var(--color-glass-border)]">
      {children}
    </kbd>
  );
}
