"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import { useUiStore } from "@/store/uiStore";

const SHORTCUTS: Array<{ keys: string[]; action: string }> = [
  { keys: ["V"], action: "Move tool (default)" },
  { keys: ["A"], action: "Add vertical line (⇧A horizontal)" },
  { keys: ["Space"], action: "Play / pause animation" },
  { keys: ["⌘", "Z"], action: "Undo" },
  { keys: ["⌘", "⇧", "Z"], action: "Redo" },
  { keys: ["R"], action: "Randomize gradient" },
  { keys: ["←→↑↓"], action: "Nudge focused point (⇧ for large steps)" },
  { keys: ["⌫"], action: "Reset focused point" },
  { keys: ["Esc"], action: "Deselect point" },
  { keys: ["H"], action: "Show / hide wireframe" },
  { keys: ["P"], action: "Toggle preset rail" },
  { keys: ["I"], action: "Toggle inspector" },
  { keys: ["E"], action: "Open export" },
  { keys: ["T"], action: "Switch theme" },
  { keys: ["?"], action: "Show shortcuts" },
];

export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts" className="max-w-md">
      <ul className="flex flex-col gap-2.5">
        {SHORTCUTS.map((s) => (
          <li key={s.action} className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted">{s.action}</span>
            <span className="flex shrink-0 gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
