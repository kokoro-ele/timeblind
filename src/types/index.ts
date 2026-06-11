import type { Localized } from "@/i18n/config";

export type StackCategory =
  | "lang"
  | "frontend"
  | "backend"
  | "data"
  | "infra";

export interface StackItem {
  name: string;
  category: StackCategory;
  level: number;
  years: number;
}

export interface Metric {
  label: string;
  value: string;
}

export interface Social {
  label: string;
  handle: string;
  url: string;
}

export interface Profile {
  name: string;
  handle: string;
  role: Localized;
  tagline: Localized;
  location: Localized;
  lat: number;
  lng: number;
  timezone: string;
  status: string;
  availability: string;
  bio: Localized;
  github: string;
  email: string;
  stack: StackItem[];
  metrics: Metric[];
  socials: Social[];
}

export interface CommitDiff {
  file: string;
  additions: string[];
  deletions: string[];
}

export interface Commit {
  hash: string;
  date: string;
  branch: string;
  refs: string[];
  title: Localized;
  author: string;
  summary: Localized;
  achievements: Localized[];
  diff: CommitDiff;
}

export interface Concert {
  id: string;
  artist: string;
  tour: string;
  venue: string;
  city: string;
  date: string;
  /** optional show start time, e.g. "19:30"; falls back to date only */
  time?: string;
  /** optional poster image (e.g. "/posters/x.jpg"); falls back to a gradient */
  poster?: string;
  genre: Localized;
  color: string;
  accent: string;
  rating: number;
  note: Localized;
}

export interface Place {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  date: string;
  emoji: string;
  note: Localized;
}

export interface TravelData {
  home: { name: string; lat: number; lng: number };
  places: Place[];
}
