export type NavId = "tech" | "timeline" | "concerts" | "travel" | "status";

export interface NavItem {
  id: NavId;
  label: string;
  /** keywords the command palette can fuzzy-match against */
  keywords: string[];
  icon: IconName;
}

export type IconName =
  | "terminal"
  | "git"
  | "music"
  | "globe"
  | "pulse"
  | "github";

export const NAV_ITEMS: NavItem[] = [
  {
    id: "tech",
    label: "Tech Stack",
    keywords: ["tech", "stack", "skills", "dashboard", "htop", "particles"],
    icon: "terminal",
  },
  {
    id: "timeline",
    label: "Experience",
    keywords: ["timeline", "experience", "git", "career", "work", "history"],
    icon: "git",
  },
  {
    id: "concerts",
    label: "Live Music",
    keywords: ["live", "concerts", "music", "gigs", "shows", "tickets", "wallet", "票夹"],
    icon: "music",
  },
  {
    id: "travel",
    label: "Footprints",
    keywords: ["travel", "footprints", "globe", "map", "places", "world"],
    icon: "globe",
  },
  {
    id: "status",
    label: "System State",
    keywords: ["status", "system", "state", "contact", "about", "now"],
    icon: "pulse",
  },
];

export function focusSection(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-bento="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  // brief highlight ping
  el.animate(
    [
      { boxShadow: "0 0 0 0 rgba(0,255,204,0.0)" },
      { boxShadow: "0 0 0 2px rgba(0,255,204,0.6)" },
      { boxShadow: "0 0 0 0 rgba(0,255,204,0.0)" },
    ],
    { duration: 900, easing: "ease-out" },
  );
}
