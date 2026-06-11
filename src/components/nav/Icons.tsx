import type { IconName } from "@/lib/nav";

const common = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "terminal":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="m7 9 3 3-3 3" />
          <path d="M13 15h4" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
        </svg>
      );
    case "git":
      return (
        <svg {...common} className={className} aria-hidden>
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="6" cy="18" r="2.4" />
          <circle cx="18" cy="9" r="2.4" />
          <path d="M6 8.4v7.2" />
          <path d="M18 11.4a6 6 0 0 1-6 6H8.4" />
        </svg>
      );
    case "music":
      return (
        <svg {...common} className={className} aria-hidden>
          <circle cx="6" cy="18" r="2.6" />
          <circle cx="17" cy="16" r="2.6" />
          <path d="M8.6 18V6l11-2v12" />
        </svg>
      );
    case "globe":
      return (
        <svg {...common} className={className} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.8 2.4 4.2 5.6 4.2 9S14.8 18.6 12 21C9.2 18.6 7.8 15.4 7.8 12S9.2 5.4 12 3Z" />
        </svg>
      );
    case "pulse":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
        </svg>
      );
    case "github":
      return (
        <svg {...common} className={className} aria-hidden>
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6A4.6 4.6 0 0 0 18.7 6 4.3 4.3 0 0 0 18.6 3s-1.1-.3-3.6 1.3a12.3 12.3 0 0 0-6 0C6.5 2.7 5.4 3 5.4 3a4.3 4.3 0 0 0-.1 3A4.6 4.6 0 0 0 4 9.3c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
        </svg>
      );
    default:
      return null;
  }
}
