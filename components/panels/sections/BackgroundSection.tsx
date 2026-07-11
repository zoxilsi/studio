"use client";

import { ColorField } from "@/components/ui/ColorField";
import { useMeshStore } from "@/store/meshStore";

export function BackgroundSection() {
  const backgroundColor = useMeshStore((s) => s.doc.canvas.backgroundColor);
  const updateCanvas = useMeshStore((s) => s.updateCanvas);
  const commit = useMeshStore((s) => s.commit);

  return (
    <>
      <ColorField
        label="Backdrop"
        value={backgroundColor}
        onChange={(v) => updateCanvas({ backgroundColor: v })}
        onCommitStart={commit}
      />
      <p className="text-[11px] leading-relaxed text-faint">
        Visible where the mesh pulls away from the canvas edges.
      </p>
    </>
  );
}
