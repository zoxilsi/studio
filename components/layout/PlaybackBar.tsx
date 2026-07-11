"use client";

/**
 * Floating playback pill under the artboard: transport, speed,
 * randomize and wireframe visibility.
 */

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import {
  EyeIcon,
  EyeOffIcon,
  PauseIcon,
  PlayIcon,
  ReverseIcon,
  ShuffleIcon,
} from "@/components/ui/icons";
import { useMeshStore } from "@/store/meshStore";
import { useUiStore } from "@/store/uiStore";

export function PlaybackBar() {
  const playing = useMeshStore((s) => s.doc.animation.playing);
  const reversed = useMeshStore((s) => s.doc.animation.reversed);
  const speed = useMeshStore((s) => s.doc.animation.speed);
  const updateAnimation = useMeshStore((s) => s.updateAnimation);
  const randomize = useMeshStore((s) => s.randomize);
  const commit = useMeshStore((s) => s.commit);
  const showHandles = useUiStore((s) => s.showHandles);
  const toggleHandles = useUiStore((s) => s.toggleHandles);

  return (
    <motion.div
      initial={{ y: 48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.15 }}
      className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3"
    >
      <GlassPanel className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1.5">
        <span className="relative inline-flex">
          {playing && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full border border-ink/30"
              animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <Button
            size="icon"
            active={playing}
            aria-label={playing ? "Pause animation" : "Play animation"}
            title="Play / pause (Space)"
            onClick={() => updateAnimation({ playing: !playing })}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </Button>
        </span>
        <Button
          size="icon"
          aria-label="Reverse playback"
          title="Reverse"
          active={reversed}
          onClick={() => updateAnimation({ reversed: !reversed })}
        >
          <ReverseIcon />
        </Button>

        <label className="mx-1 hidden items-center gap-2 sm:flex" title="Animation speed">
          <span className="font-mono text-[10px] tabular-nums text-faint">{speed.toFixed(1)}×</span>
          <input
            type="range"
            className="mesha-range !w-20"
            style={{ "--fill": `${((speed - 0.1) / 2.9) * 100}%` } as CSSProperties}
            min={0.1}
            max={3}
            step={0.1}
            value={speed}
            aria-label="Animation speed"
            onPointerDown={() => commit()}
            onChange={(e) => updateAnimation({ speed: parseFloat(e.target.value) })}
          />
        </label>

        <span className="mx-1 h-5 w-px bg-glass-border" aria-hidden />

        <Button size="icon" aria-label="Randomize gradient" title="Randomize (R)" onClick={randomize}>
          <ShuffleIcon />
        </Button>
        <Button
          size="icon"
          aria-label={showHandles ? "Hide mesh wireframe" : "Show mesh wireframe"}
          title="Wireframe (H)"
          onClick={toggleHandles}
        >
          {showHandles ? <EyeIcon /> : <EyeOffIcon />}
        </Button>
      </GlassPanel>
    </motion.div>
  );
}
