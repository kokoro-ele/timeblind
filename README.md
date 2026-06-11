# timeblind // cyber resume

A Modern Cyber-Geek personal landing page for job hunting. Built as a single static page with a declarative, data-driven architecture: the UI is just a shell, all content lives in `data/*.json`.

Stack: Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS v4 · Three.js / react-three-fiber · WebGL shaders · Canvas 2D · cmdk · motion.

## Features

- Bento-grid layout of frosted-glass "pods" over a cursor-tracing mesh grid.
- Dual-rail navigation: a `⌘K` / `Ctrl+K` command palette and a magnifying bottom dock.
- Five "show-off" modules:
  1. Tech Stack Dashboard — htop-style panel + Canvas 2D particle text (mouse-repelled, spring-back).
  2. Experience Timeline — git graph + `git show` diff with text-scramble decode.
  3. Live Music Visualizer — vinyl wall + GLSL shader spectrum driven by simulated data.
  4. Travel Footprints — 3D rotating globe (real coastlines) with radar-ping markers.
  5. System State + a styled `console.log` easter egg (open F12, then type `hire`).
- i18n: English (default), 中文, 日本語 — toggled from the dock, persisted to `localStorage`.

## Data-driven content

Edit the JSON in `data/` — no UI code changes needed. Next.js statically injects it at build time (SSG).

```
data/
├── profile.json    # status, coords, tech-stack metrics, socials
├── timeline.json   # career commits
├── concerts.json   # live shows
└── travel.json     # travel footprints (lat/lng + notes)
```

### Localized fields

Any human-readable field can be either a plain string or a per-locale object that falls back to English:

```json
"tagline": { "en": "Building...", "zh": "打造...", "ja": "..." }
```

UI strings live in `src/i18n/messages.ts`. Add a locale in `src/i18n/config.ts`.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export to ./out
```

## Deploy

Static export (`output: "export"`). Push to GitHub and import on Vercel (or any static host) — editing a `data/*.json` file and pushing re-triggers a build/deploy.
