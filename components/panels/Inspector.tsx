"use client";

/**
 * The right sidebar: Settings, Point, Color, Effects, Animation and
 * Background sections, with the primary Export action pinned below —
 * the classic design-tool inspector column.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { DownloadIcon } from "@/components/ui/icons";
import { SettingsSection } from "./sections/SettingsSection";
import { NodeSection } from "./sections/NodeSection";
import { ColorSection } from "./sections/ColorSection";
import { EffectsSection } from "./sections/EffectsSection";
import { PatternSection } from "./sections/PatternSection";
import { BackdropGlowSection } from "./sections/BackdropGlowSection";
import { AnimationSection } from "./sections/AnimationSection";
import { BackgroundSection } from "./sections/BackgroundSection";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";

export function Inspector() {
  const open = useUiStore((s) => s.inspectorOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const hasSelection = useMeshStore((s) => s.selectedId !== null);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "auto", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="z-30 h-full shrink-0 overflow-hidden border-l border-glass-border bg-glass backdrop-blur-2xl max-md:absolute max-md:right-0 max-md:top-0"
          aria-label="Inspector"
        >
          <div className="flex h-full w-[17.5rem] flex-col">
            <div className="studio-scroll flex-1 overflow-y-auto overscroll-contain">
              <Section title="Settings" defaultOpen>
                <SettingsSection />
              </Section>
              <Section title="Point" defaultOpen={hasSelection}>
                <NodeSection />
              </Section>
              <Section title="Color">
                <ColorSection />
              </Section>
              <Section title="Effects">
                <EffectsSection />
              </Section>
              <Section title="Pattern">
                <PatternSection />
              </Section>
              <Section title="Backdrop glow">
                <BackdropGlowSection />
              </Section>
              <Section title="Animation">
                <AnimationSection />
              </Section>
              <Section title="Background">
                <BackgroundSection />
              </Section>
            </div>
            <footer className="border-t border-glass-border p-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setExportOpen(true)}
              >
                <DownloadIcon /> Export
              </Button>
            </footer>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
