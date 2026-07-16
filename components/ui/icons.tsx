/**
 * Minimal 16×16 stroke icon set, drawn by hand. One consistent 1.5px
 * stroke weight keeps the chrome quiet — no icon library needed.
 */

import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M5 3.5v9l7.5-4.5L5 3.5Z" fill="currentColor" stroke="none" /></Icon>
);
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M5.5 3.5v9M10.5 3.5v9" strokeWidth="2" /></Icon>
);
export const ReverseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M8 3a5 5 0 1 1-4.7 3.3" /><path d="M3 3v3.5h3.5" /></Icon>
);
export const UndoIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M6.5 4 3.5 7l3 3" /><path d="M3.5 7h5.75a3.25 3.25 0 0 1 0 6.5H7" /></Icon>
);
export const RedoIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m9.5 4 3 3-3 3" /><path d="M12.5 7H6.75a3.25 3.25 0 0 0 0 6.5H9" /></Icon>
);
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M8 3.5v9M3.5 8h9" /></Icon>
);
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 4.5h10M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4.5l.5 8a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-8" /></Icon>
);
export const CloseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m4 4 8 8M12 4l-8 8" /></Icon>
);
export const ChevronIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m5 6.5 3 3 3-3" /></Icon>
);
export const ShuffleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 4.5h1.8c.9 0 1.7.4 2.2 1.1l2 2.8c.5.7 1.3 1.1 2.2 1.1H13" /><path d="M3 11.5h1.8c.9 0 1.7-.4 2.2-1.1l.4-.55M8.6 5.6l.4-.5c.5-.7 1.3-1.1 2.2-1.1H13" /><path d="m11.5 2.5 2 1.5-2 1.5M11.5 9.5l2 1.5-2 1.5" /></Icon>
);
export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M8 2.5v7M5 7l3 3 3-3M3 12.5h10" /></Icon>
);
export const SunIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" /></Icon>
);
export const MoonIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M13 9.3A5.5 5.5 0 0 1 6.7 3a5.5 5.5 0 1 0 6.3 6.3Z" /></Icon>
);
export const PointsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="5" cy="5" r="1.6" /><circle cx="11.5" cy="6.5" r="1.6" /><circle cx="7" cy="11.5" r="1.6" /></Icon>
);
export const EyeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8Z" /><circle cx="8" cy="8" r="2" /></Icon>
);
export const EyeOffIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M1.8 8S4 3.8 8 3.8c1 0 1.9.26 2.7.65M14.2 8S12 12.2 8 12.2c-1 0-1.9-.26-2.7-.65" /><path d="m3 13 10-10" /></Icon>
);
export const GridIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1.2" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1.2" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1.2" /><rect x="9" y="9" width="4.5" height="4.5" rx="1.2" /></Icon>
);
export const SlidersIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 5h4.5M10.5 5H13M3 11h2.5M8.5 11H13" /><circle cx="9" cy="5" r="1.5" /><circle cx="7" cy="11" r="1.5" /></Icon>
);
export const KeyboardIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="1.8" y="4" width="12.4" height="8" rx="1.5" /><path d="M4.2 6.5h.01M6.6 6.5h.01M9 6.5h.01M11.4 6.5h.01M4.2 9h.01M11.4 9h.01M6 9.5h4" /></Icon>
);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m3.5 8.5 3 3 6-7" /></Icon>
);
export const CopyIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" /></Icon>
);
export const FilmIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 3v10M11 3v10M2 6h3M2 10h3M11 6h3M11 10h3" /></Icon>
);
export const GithubIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden
    {...p}
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);
export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m8 2 1.8 3.7 4 .6-2.9 2.8.7 4.1-3.6-1.9-3.6 1.9.7-4.1-2.9-2.8 4-.6L8 2Z" /></Icon>
);
export const HeartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M8 13.3C6.5 12.1 2.8 9.6 2.8 6.4A2.6 2.6 0 0 1 8 4.7a2.6 2.6 0 0 1 5.2 1.7c0 3.2-3.7 5.7-5.2 6.9Z" /></Icon>
);
export const CoffeeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 6.5h8.5v3.2a2.8 2.8 0 0 1-2.8 2.8H5.8A2.8 2.8 0 0 1 3 9.7V6.5Z" />
    <path d="M11.5 7.2H13a1.4 1.4 0 0 1 0 2.8h-1.5" />
    <path d="M5.3 2.6c-.5.6-.5 1.2 0 1.8M8 2.6c-.5.6-.5 1.2 0 1.8" />
  </Icon>
);
