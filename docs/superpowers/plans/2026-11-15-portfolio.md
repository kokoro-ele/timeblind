# Portfolio refresh implementation plan
Goal: Align the personal homepage with the supplied resume and showcase three live projects.
Architecture: Keep the existing static Next.js app, JSON content layer and locale provider. Add one portfolio component; retain hidden concert code.
Tech Stack: Next.js 16, React 19, TypeScript, Tailwind.
Spec: ../specs/2026-11-15-portfolio.md

## Tasks
- [x] Update data/profile.json and data/timeline.json in all three locales from the supplied resume; avoid invented proficiency metrics.
- [x] Add typed data/projects.json and Portfolio.tsx; replace the homepage card and navigation, including translated labels and search keywords.
- [x] Update metadata to timeblind.xyz and resume positioning.
- [x] Build and type-check, check three project URLs, locale switching, narrow viewport overflow, and removal of concert UI.
- [ ] Review changes, commit and deploy to the verified existing project; verify the live domain.

## Review focus
Long multilingual copy must wrap on mobile. Navigation must target the portfolio section. All three locale dictionaries must be complete. Concert source must remain recoverable but absent from homepage. Resume facts must match the user's supplied text.

Validation: production webpack build and TypeScript passed; browser checks at 1440px and 390px across en/zh/ja passed, no runtime errors or overflow. Independent reviewer found year-range truncation; rendering now preserves full dates.
