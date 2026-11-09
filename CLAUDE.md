# Project notes for Claude

Personal strength-training PWA (Fitbod replacement) for one user on an Android phone. **SPEC.md is the full brief: read it first.**
Build it one stage at a time (SPEC §9). Before each stage: give the user a short plan and ask anything unclear; build only after approval.
After each stage, tell the user what's new and what is not done yet.

This project is built in turns by two separate Claude sessions that don't share memory. SPEC.md is the brief. **Before starting, read the "Progress" section below. Before finishing, update it.**

## Progress
- **Current stage:** Stage 5 is live, plus the body map re-traced from the user's reference screenshots (`bd92f2f`). The user chose to publish it on the public site anyway, knowing the repo is public. Stage 6 is next.
- **Done:** Stage 1 Core logging (`6831267`), Stage 2 Log tab (`327214b`), both live. Stage 3 Progress: exercise history screen (`/exercise/:id`: range toggle, e1RM line chart, PR + average, records, past sessions), Body tab with Results/Recovery sub-tabs and editable benchmark lifts. History is reachable from the History chip while logging, exercise names on a workout summary, and benchmark cards. Stage 4 Targets: hexagon ring (two sides per group, coloured push/pull/legs), Push/Pull/Legs rows that expand to per-muscle sets, 9-week history row (tap a week to view it), "Edit targets" sheet. Stage 5 Recovery: Body > Recovery with last-workout and fresh-muscle stats, original front/back body map (`BodyMap.tsx`, coloured red <50 / amber 50–89 / lime 90+), muscle list sorted least recovered first, and a muscle sheet (recovery %, time to full, recent workouts, set-by-hand slider).
- **In progress / known bugs:** nothing in progress. No known bugs. Unverified on a real phone (the user hasn't tested yet): rest-timer vibration and beep, keep-screen-on (Wake Lock), Add to Home screen, the Stage 3 chart's touch tooltip, and tapping small muscles on the body map with a finger.
- **Next step:** plan Stage 6 (Strength score on Body > Results: overall score, Push/Pull/Legs cards with sub-groups and sparklines, trend badges; plus the Workout Report with muscle strength and volume carousels; SPEC §3.4, §3.9a, §5) with the user. After that: 7 My Plan · 8 Polish (milestones screen, streak polish, Fitbod CSV import, PWA install polish).
- **Decisions made (and why):** see "Behaviour decisions already made" below. Add new ones there, each with a short reason.

## Run, test, deploy
- `npm run dev` (http://localhost:5173, `--host` so the LAN works), `npm test` (vitest, pure logic in `src/lib/*.test.ts`), `npm run build` (`tsc -b` + vite).
- `.claude/launch.json` has a `gym-app` dev-server config for the browser preview.
- Live: https://vanillaface369.github.io/gym-app/ (public repo `Vanillaface369/gym-app`). Every push to `main` deploys via `.github/workflows/deploy.yml` (runs tests, builds with `BASE_PATH=/gym-app/`).
- Commit at the end of each stage ("Stage N: …"). Ask before pushing, because pushing changes the live app.
- Git identity is set repo-locally to the GitHub username with the GitHub no-reply email. Keep it that way; don't use a personal email.

## Stack & conventions
- React 19 + TypeScript 7 + Vite 8 + Tailwind v4 (theme tokens in `src/index.css` `@theme`), Dexie 4 + `dexie-react-hooks` (`useLiveQuery`), React Router 7 with **HashRouter** (needed for GitHub Pages), `vite-plugin-pwa` (offline precache, autoUpdate).
- Recharts 3 is installed (stage 3). The e1RM chart is `src/features/progress/E1rmChart.tsx`, which also has a plain-SVG `Sparkline` for small cards.
- **All weights are stored in kg.** Convert only for display/input with `toDisplay`/`fromDisplay`/`fmtWeight` in `src/lib/format.ts`. Australian locale (`en-AU`), dd/mm.
- IDs: `uid()` from `format.ts` (not `crypto.randomUUID`, which fails on plain-http LAN testing). Seeded exercise ids are slugs (`lat-pulldown`).
- Dark theme, single accent `#b6f23a` (lime). Original design only: no Fitbod branding, art, photos or videos. **One exception, at the user's request (11/2026):** the body map shapes (`src/features/body/bodyShapes.ts`) are traced from Fitbod screenshots the user supplied. The user says Fitbod support allowed this for personal use only, and chose to publish it on the public site anyway. Exercise thumbnails are category-coloured initials tiles (`ExerciseThumb`).
- Screens are mobile-first, max-w-lg, bottom tab bar, a fixed bottom action bar with `pb-safe`.

## Code map
- `src/db/types.ts`: data model (SPEC §4 plus extras: `Exercise.useCount`, `PersonalRecord.previous`, `WorkoutSession.recordsCount/exerciseOrder`, `Settings.lifetimeOffset/selectedTemplateId/benchmarkIds/...`, `ActiveWorkout`).
- `src/db/db.ts`: Dexie schema v1 and populate-on-create. **If you change indexes or tables, add `this.version(2)`. Don't edit v1**, because the user's phone already has v1 data.
- `src/db/seed.ts`: the user's exercises, templates, working weights, Lat Pulldown e1RM PR 90.7 kg, and Fitbod lifetime totals (206 workouts / 932,150 kg / 34,468 kcal) in `settings.lifetimeOffset`.
- `src/db/actions.ts`: all writes: building a workout from a template (pre-fills from last session; Max Effort = ramp to a top set), active-workout mutations, rest timer, `finishWorkout` (writes sessions/sets/records), `saveSessionEdits`, `createManualSession`, `deleteSession`, `rebuildRecords`, template edits, JSON workout import.
- `src/db/backup.ts`: full JSON export/import/reset. **Any new table must be added to `TABLES` in db.ts** so backups include it.
- `src/lib/calc.ts`: e1RM (Epley), volume, calories, max-effort ramp, `detectRecords`. `src/lib/stats.ts`: weeks, streak, calendar grid, milestone tiers. `src/lib/progress.ts`: per-session e1RM points, range filtering, monthly bests, all-time bests, benchmark picking. `src/lib/targets.ts`: weekly set counting and % per group. `src/lib/recovery.ts`: fatigue doses, hours needed, recovery % with overrides (reuse it in stage 7 workout generation).
- `src/features/body/bodyShapes.ts` is generated by `tools/bodymap/trace.py` + `gen.py`: run them in a folder holding the two reference screenshots as `front.webp` / `back.webp` (891x2000; not in the repo). `gen.py` maps contour numbers to muscles. A region can cover several muscles, and it shows the least recovered one.
- `src/lib/hooks.ts`: `useSettings`, `useActive`, `useExercises`, `useNow`, `useWakeLock`, audio unlock/beep, vibrate.
- `src/features/*`: screens. `src/components/`: shared UI (`Sheet`, `Confirm`, `Chip`, `NumberField`, `ExercisePicker`, `RestPicker`, icons, `Layout`).

## Behaviour decisions already made (don't undo without asking)
- **PRs:** an exercise's first-ever session sets a silent baseline (`previous` undefined, not counted). Only records that beat a previous best are celebrated or counted. Deleting or editing a workout calls `rebuildRecords` for the affected exercises.
- The rest timer uses stored timestamps (`endsAt` / `pausedRemainingMs`), never interval counting. `RestAlarm` at app level fires vibrate and beep once per rest. Audio is unlocked on the Log Set tap.
- Editing a set's weight or reps copies the new value to later unlogged sets that had the old value (or no weight). Max Effort sets are excluded.
- Edits on the Workout tab (the ⋯ menu) change the **template**. Edits during an active workout change only that session.
- `NumberField` keeps local text while focused. A controlled value fed straight from Dexie drops keystrokes, so don't change it back.
- `ActiveWorkoutPage` uses a `leaving` ref so its "no active workout, go home" redirect doesn't race navigation to the summary.
- Cancelling edit on a workout with no exercises deletes it (for blank past workouts created with +).
- Weekly goal and streak count distinct training days. The current week only adds to the streak once met and never breaks it.
- Exercise history: e1RM counts every working set (warm-ups skipped), including Max Effort singles. Week/Month plot every session; 6 Month/Year plot each month's best. The range opens on the shortest one with at least 2 points, so the first view is a line, not a dot.
- A seeded e1RM record (no `sessionId`, from Fitbod) counts as the PR, labelled "from Fitbod", when it beats everything logged. It has no date, so it isn't charted until the Fitbod import (stage 8). The user chose this.
- Benchmark lifts default to the 5 most-used exercises (`useCount`). Once the user edits them, `Settings.benchmarkIds` holds the pinned list. "Use most used" clears it again.
- Weekly targets: each working set counts **once** toward its exercise's category (push/pull/legs); core/other count nowhere. The per-muscle breakdown uses SPEC's primary 1 / secondary 0.5, so it doesn't sum to the group total (a note on screen says so). Summing muscle credits instead would make one bench set count ~2 push sets. The user chose this.
- Each group counts toward the overall % only up to its target, so extra push can't hide missing legs. Sets go into the week their workout **started** in.
- Targets are edited from the Targets tab ("Edit targets") for now. My Plan (stage 7) should link to the same editor, not duplicate it.
- Recovery: dose per muscle per workout = 1 per primary set + 0.5 per secondary. Hours needed = 48 up to dose 3, rising evenly to 96 at dose 12+. With several recent workouts, the least recovered one counts. Looks back 14 days, using the session's `endedAt`.
- A manual recovery value (`recoveryOverrides`) is a starting point that keeps rising at the muscle's normal pace. It's dropped once a workout that trains that muscle **finishes after** it was set. The user chose this over a value that stays frozen.
- Body map colours **fade** with recovery %: red at 0% → amber at 50% → lime at 90%+ (fresh), mixed with CSS `color-mix(in oklab, …)` using the `--color-danger` / `--color-warn` / `--color-accent` tokens. The % is always shown as text too. The user first chose three fixed bands, then asked for the fade.
- Recovery maths clamps "time since" at 0, because `useNow` ticks once a minute and a just-saved workout or override can look slightly in the future.
- No login screen. The user asked for one, then dropped it: on a static GitHub Pages site with a public repo, a login running on the phone can't hide anything (the code and shapes are public anyway), and all data stays on the phone already.
- Placeholders still to replace: the Strength score card on Body > Results (stage 6), "Pick muscle groups" (stage 7), "Import Fitbod CSV" (stage 8), the Milestones stat tap (stage 8), and "My Plan" (it opens Settings until stage 7).
- Pull Day's "+1 more" exercise from SPEC §7 is unknown; it was left out. Push Day, Seated Leg Curl and Leg Press weights start blank.

## Testing tips
- In the dev browser you can drive the data layer directly: `await import('/src/db/actions.ts')`, `await import('/src/db/backup.ts')` (`resetAll()` to clean up after seeding test data).
- Browser-pane screenshots sometimes lag a render. Confirm with `get_page_text` or by reading IndexedDB before calling something a bug.
