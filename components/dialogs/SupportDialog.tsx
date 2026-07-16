"use client";

/**
 * Support hub: a small scannable UPI QR and a Buy Me a Coffee link. Reached
 * two ways — from the top-bar heart (calm intro) and as a gentle nudge right
 * after an export completes. Both share one body, so payment details live in
 * exactly one place.
 *
 * Deliberately monochrome: it borrows the studio's own glass tokens and
 * button, adds no new palette, and stays compact.
 */

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { CoffeeIcon } from "@/components/ui/icons";
import { useUiStore } from "@/store/uiStore";
import { SUPPORT } from "@/lib/support";
import { cn } from "@/lib/utils";

/**
 * QR plate: a labelled placeholder sits underneath while the real QR is
 * absent, and the image fades in over it once `public/support-qr.png`
 * loads — so a missing file never flashes a broken image.
 */
function QrImage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-[136px] w-[136px]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded border border-dashed border-black/15 px-2 text-center">
        <span className="text-[11px] font-semibold text-black/55">Your UPI QR</span>
        <span className="text-[9px] leading-tight text-black/35">public/support-qr.png</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SUPPORT.upiQrSrc}
        alt="UPI QR code — scan with any UPI app to pay"
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </div>
  );
}

function SupportBody() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col items-center gap-2 rounded-xl border border-glass-border bg-glass-soft p-3.5">
        <div className="rounded-lg bg-white p-2 shadow-lift">
          <QrImage />
        </div>
        <span className="text-[11px] font-medium text-muted">Scan with any UPI app</span>
        {SUPPORT.upiId && (
          <span className="font-mono text-[11px] text-faint">{SUPPORT.upiId}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-glass-border" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">or</span>
        <span className="h-px flex-1 bg-glass-border" />
      </div>

      <a href={SUPPORT.buyMeACoffeeUrl} target="_blank" rel="noopener noreferrer" className="w-full">
        <Button variant="primary" className="w-full">
          <CoffeeIcon />
          Buy me a coffee
        </Button>
      </a>
    </div>
  );
}

export function SupportDialog() {
  const supportOpen = useUiStore((s) => s.supportOpen);
  const setSupportOpen = useUiStore((s) => s.setSupportOpen);
  const nudgeOpen = useUiStore((s) => s.supportNudgeOpen);
  const setNudgeOpen = useUiStore((s) => s.setSupportNudgeOpen);

  return (
    <>
      {/* Opened from the top-bar heart */}
      <Dialog open={supportOpen} onClose={() => setSupportOpen(false)} title="Support" className="max-w-[300px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-ink">Even ₹1 can make a change.</p>
            <p className="text-[12.5px] leading-relaxed text-muted">
              Support us to keep zoxilsi studio free for everyone.
            </p>
          </div>
          <SupportBody />
        </div>
      </Dialog>

      {/* Gentle nudge after an export completes */}
      <Dialog open={nudgeOpen} onClose={() => setNudgeOpen(false)} title="Thanks for creating ✨" className="max-w-[300px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-ink">Even ₹1 can make a change.</p>
            <p className="text-[12.5px] leading-relaxed text-muted">
              Loved your export? Support us to keep zoxilsi studio free for everyone.
            </p>
          </div>
          <SupportBody />
          <button
            type="button"
            onClick={() => setNudgeOpen(false)}
            className="mx-auto -mt-0.5 cursor-pointer text-[11px] font-medium text-faint transition-colors hover:text-muted"
          >
            Maybe later
          </button>
        </div>
      </Dialog>
    </>
  );
}
