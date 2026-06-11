import profileJson from "@data/profile.json";
import timelineJson from "@data/timeline.json";
import concertsJson from "@data/concerts.json";
import travelJson from "@data/travel.json";

import type { Profile, Commit, Concert, TravelData } from "@/types";

/**
 * Typed accessors over the declarative data layer (data/*.json).
 * UI components import from here only; they never hardcode content.
 * Everything is resolved at build time, so the site stays fully static (SSG).
 */

export const profile: Profile = profileJson as unknown as Profile;

export const commits: Commit[] =
  (timelineJson.commits as unknown as Commit[]) ?? [];

export const concerts: Concert[] =
  (concertsJson.concerts as unknown as Concert[]) ?? [];

export const travel: TravelData = travelJson as unknown as TravelData;

export function getProfile(): Profile {
  return profile;
}

export function getCommits(): Commit[] {
  return commits;
}

export function getConcerts(): Concert[] {
  return concerts;
}

export function getTravel(): TravelData {
  return travel;
}
