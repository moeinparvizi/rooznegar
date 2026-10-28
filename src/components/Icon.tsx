import type { SVGProps } from "react";

export type IconName =
  | "today"
  | "week"
  | "progress"
  | "me"
  | "clock"
  | "play"
  | "pause"
  | "stop"
  | "check"
  | "close"
  | "chevronDown"
  | "chevronLeft"
  | "arrowLeft"
  | "plus"
  | "send"
  | "calendar"
  | "headphones"
  | "target"
  | "book"
  | "bell"
  | "moon"
  | "sun"
  | "monitor"
  | "download"
  | "upload"
  | "trash"
  | "refresh"
  | "pen"
  | "leaf"
  | "sparkle"
  | "dumbbell"
  | "linkedin"
  | "coffee"
  | "list"
  | "feather"
  | "wifiOff"
  | "install";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "today":
      return (
        <svg {...common}>
          <path d="M12 21a9 9 0 1 0-9-9" />
          <path d="M12 7v5l3 2" />
          <path d="M3.5 3.5 6 6" />
          <path d="M3 12H1.5" />
        </svg>
      );
    case "week":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2v4M16 2v4M3 9h18" />
          <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
        </svg>
      );
    case "progress":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />
          <path d="M20 7c-2.5.4-4.5 2-5.5 4.5" opacity=".5" />
        </svg>
      );
    case "me":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M8 5.5c0-.9 1-1.4 1.7-.9l8 6.4c.6.5.6 1.5 0 2l-8 6.5c-.7.5-1.7 0-1.7-.9V5.5Z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <rect x="6" y="5" width="4" height="14" rx="1.4" />
          <rect x="14" y="5" width="4" height="14" rx="1.4" />
        </svg>
      );
    case "stop":
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2.5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12.5 4.2 4.2L19 6.8" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg {...common}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...common}>
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "send":
      return (
        <svg {...common}>
          <path d="m21 3-7.2 18-3.6-7.2L3 10.2 21 3Z" />
          <path d="M10.2 13.8 21 3" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "headphones":
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="3" y="13" width="4" height="7" rx="2" />
          <rect x="17" y="13" width="4" height="7" rx="2" />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2.5" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12M7 10l5 5 5-5" />
          <path d="M4 19v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 19v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
          <path d="M10 10v7M14 10v7" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 1 0-2.3 6.7" />
          <path d="M20 4v7h-7" />
        </svg>
      );
    case "pen":
      return (
        <svg {...common}>
          <path d="m4 20 4.5-1L20 7.5a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
          <path d="m15 6 3 3" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M20 4C10 4 4 9 4 16c0 2 .8 3.6 2 4.8C13 21 20 14 20 4Z" />
          <path d="M4 21c2.5-6 6.5-9.5 11.5-12" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...common}>
          <path d="M12 3c.4 4.8 2.7 7.1 7.5 7.5-4.8.4-7.1 2.7-7.5 7.5-.4-4.8-2.7-7.1-7.5-7.5C9.3 10.1 11.6 7.8 12 3Z" />
          <path d="M19 16.5c.2 2 1.1 2.9 3 3.2-1.9.2-2.8 1.1-3 3.1-.2-2-1.1-2.9-3-3.1 1.9-.3 2.8-1.2 3-3.2Z" />
        </svg>
      );
    case "dumbbell":
      return (
        <svg {...common}>
          <path d="M6.5 7.5v9M3.5 9.5v5M17.5 7.5v9M20.5 9.5v5M6.5 12h11" />
          <path d="M3.5 12h-.5M21 12h-.5" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M8 10v7" />
          <circle cx="8" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
          <path d="M12 17v-4.4a2.6 2.6 0 0 1 5.2 0V17M12 10v7" />
        </svg>
      );
    case "coffee":
      return (
        <svg {...common}>
          <path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
          <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M7 3c0 1-1 1.5-1 2.5M11 3c0 1-1 1.5-1 2.5" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "feather":
      return (
        <svg {...common}>
          <path d="M20 4C13 4 7 8 5 16l-2 5 5-2c8-2 12-8 12-15Z" />
          <path d="M4 20c2-5 5-8 10-10" />
        </svg>
      );
    case "wifiOff":
      return (
        <svg {...common}>
          <path d="M2 2l20 20" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M5 13a10 10 0 0 1 4-2.4M15 10.6a10 10 0 0 1 4 2.4" />
          <path d="M2 8.8A15 15 0 0 1 7 6M17 6a15 15 0 0 1 5 2.8" />
          <circle cx="12" cy="20" r=".8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "install":
      return (
        <svg {...common}>
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <path d="M12 6v8M9 11l3 3 3-3" />
          <path d="M10 18h4" />
        </svg>
      );
    default:
      return null;
  }
}
