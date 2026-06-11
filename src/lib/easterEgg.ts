import type { Profile } from "@/types";
import { loc, DEFAULT_LOCALE } from "@/i18n/config";

let injected = false;

/**
 * Prints a styled ASCII resume + source link into the devtools console.
 * For the curious who open F12. Runs once per session.
 */
export function injectConsoleEasterEgg(profile: Profile) {
  if (injected || typeof window === "undefined") return;
  injected = true;

  const banner = `
   __  _                 __    ___           __
  / /_(_)_ _  ___ ___   / /   / (_)__  ___/ /
 / __/ /  ' \\/ -_) _ \\ / _ \\ / / / _ \\/ _  /
 \\__/_/_/_/_/\\__/_.__//_.__//_/_/_//_/\\_,_/   ${profile.handle}
`;

  const head = "color:#00ffcc;font-family:monospace;font-size:12px;";
  const label = "color:#71717a;font-family:monospace;";
  const val = "color:#d4d4d8;font-family:monospace;";
  const accent = "color:#00ffcc;font-family:monospace;font-weight:bold;";

  console.log(`%c${banner}`, head);
  console.log(
    `%cwhoami %c${profile.name} — ${loc(profile.role, DEFAULT_LOCALE)}`,
    label,
    val,
  );
  console.log(`%cstatus  %c${profile.availability}`, label, accent);
  console.log(
    `%clocation%c ${loc(profile.location, DEFAULT_LOCALE)}`,
    label,
    val,
  );
  console.log(
    "%c\n> You found the console. We should talk.",
    "color:#38bdf8;font-family:monospace;font-style:italic;",
  );
  console.log(
    `%c> source:%c ${profile.github}\n%c> email :%c ${profile.email}`,
    label,
    "color:#00ffcc;font-family:monospace;text-decoration:underline;",
    label,
    "color:#00ffcc;font-family:monospace;text-decoration:underline;",
  );

  // a tiny interactive easter egg
  try {
    Object.defineProperty(window, "hire", {
      get() {
        console.log(
          `%c[ recruiter mode ] dispatching resume to ${profile.email} ...`,
          accent,
        );
        return `mailto:${profile.email}`;
      },
      configurable: true,
    });
    console.log(
      "%ctip: type %chire%c in this console.",
      label,
      accent,
      label,
    );
  } catch {
    // ignore if property already defined
  }
}
