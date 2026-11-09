# Liftlog (personal gym app)

Offline-first PWA for logging strength workouts. See [SPEC.md](SPEC.md) for the full brief.

## Run on your PC

```
npm install
npm run dev
```

Open http://localhost:5173. `npm test` runs the calculation tests, `npm run build` makes a production build in `dist/`.

## Deploy

Pushing to `main` on GitHub builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.
(In the repo: Settings → Pages → Source = "GitHub Actions".)

## Where things live

- `src/db/` – Dexie schema (`db.ts`), seed exercises/templates/weights (`seed.ts`), all data changes (`actions.ts`), JSON backup (`backup.ts`)
- `src/lib/` – calculations (`calc.ts`), formatting/units (`format.ts`), React hooks incl. wake lock and timer sound (`hooks.ts`)
- `src/features/` – screens: `workout/` (Workout tab, Switch sheet), `session/` (active workout, set logging, rest timer, summary), `settings/`, `log/` (Log tab, past-workout sheet, placeholder tabs)
- `src/components/` – shared UI (sheets, chips, icons, exercise picker, tab layout)

## Build stages

1. ✅ Core logging · 2. ✅ Log tab
3. Progress · 4. Targets · 5. Recovery · 6. Strength score · 7. My Plan · 8. Polish
