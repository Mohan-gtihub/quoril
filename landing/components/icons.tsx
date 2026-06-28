/** Minimal stroke icon set (Lucide-style) used across the marketing site. */
type P = React.SVGProps<SVGSVGElement>;
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const IconBoard = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="18" rx="1.5" />
    <rect x="14" y="3" width="7" height="11" rx="1.5" />
  </svg>
);
export const IconClock = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconChart = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-6" />
  </svg>
);
export const IconScreen = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M8 21h8M12 18v3" />
  </svg>
);
export const IconCanvas = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
  </svg>
);
export const IconLayers = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
export const IconGlobe = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);
export const IconArrow = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconBolt = (p: P) => (
  <svg {...p} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-12H12l1-8Z" />
  </svg>
);
export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconFolders = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h2l1.5 2H18a1.5 1.5 0 0 1 1.5 1.5V8" />
    <rect x="3" y="8" width="15" height="11" rx="1.5" />
  </svg>
);
export const IconPhone = (p: P) => (
  <svg {...base} {...p}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </svg>
);
export const IconSettings = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);
export const IconDiscord = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M19.27 5.33A16.6 16.6 0 0 0 15.13 4a.06.06 0 0 0-.07.03c-.18.32-.38.74-.52 1.07a15.3 15.3 0 0 0-4.6 0c-.14-.34-.35-.75-.53-1.07A.06.06 0 0 0 9.34 4a16.55 16.55 0 0 0-4.15 1.33.05.05 0 0 0-.02.02C2.55 9.27 1.82 13.1 2.18 16.9a.07.07 0 0 0 .03.05 16.7 16.7 0 0 0 5.02 2.55.06.06 0 0 0 .07-.02c.39-.53.73-1.09 1.02-1.68a.06.06 0 0 0-.03-.09c-.55-.2-1.07-.45-1.57-.74a.06.06 0 0 1 0-.11c.11-.08.21-.16.31-.25a.06.06 0 0 1 .06-.01c3.3 1.51 6.88 1.51 10.14 0a.06.06 0 0 1 .06.01c.1.09.2.17.31.25a.06.06 0 0 1 0 .11c-.5.29-1.02.54-1.57.74a.06.06 0 0 0-.03.09c.3.59.64 1.15 1.02 1.68a.06.06 0 0 0 .07.02 16.65 16.65 0 0 0 5.03-2.55.06.06 0 0 0 .03-.05c.43-4.39-.72-8.19-3.04-11.55a.05.05 0 0 0-.02-.02ZM8.52 14.59c-1 0-1.82-.92-1.82-2.04 0-1.13.8-2.04 1.82-2.04 1.03 0 1.84.92 1.83 2.04 0 1.12-.8 2.04-1.83 2.04Zm6.97 0c-1 0-1.82-.92-1.82-2.04 0-1.13.8-2.04 1.82-2.04 1.03 0 1.84.92 1.83 2.04 0 1.12-.8 2.04-1.83 2.04Z" />
  </svg>
);
export const IconGrip = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </svg>
);
