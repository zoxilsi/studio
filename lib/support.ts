/**
 * Support / donation details. This is the single source of truth — the
 * Support button, dialog and post-export popup all read from here.
 *
 * The UPI QR is a static image. Drop your QR PNG at `public/support-qr.png`
 * (or repoint `upiQrSrc`). A wrong QR sends people's money to the wrong
 * account, so keep this in sync with your real UPI — the UI never generates
 * or guesses a QR.
 */
export const SUPPORT = {
  /** Buy Me a Coffee profile URL. */
  buyMeACoffeeUrl: "https://buymeacoffee.com/hizoxilsij",
  /** UPI QR image served from /public. */
  upiQrSrc: "/support-qr.png",
  /** Optional UPI id shown as scannable text under the QR ("" hides it). */
  upiId: "",
} as const;
