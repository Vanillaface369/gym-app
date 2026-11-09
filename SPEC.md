# Personal Gym App — Build Brief

A personal strength-training app to replace my paid Fitbod subscription. It's for my own use only, on my Android phone.

Fitbod is the reference for features and flow. **Do not copy its branding, name, artwork, exercise photos or videos.** Use original design, icons and illustrations.

---

## 1. Platform & stack

- **Type:** Progressive Web App (installable to the Android home screen, works fully offline)
- **Stack:** React + TypeScript + Vite, Tailwind for styling
- **Storage:** IndexedDB via Dexie. All data stays on the device.
- **Charts:** Recharts (or similar lightweight library)
- **Backup:** export/import all data as a JSON file (manual backup, since there's no cloud sync)
- **Hosting:** any free static host (Netlify, Vercel, Cloudflare Pages, or GitHub Pages)
- **Units:** kg by default, with a kg/lb toggle
- **Locale:** Australian English and dates (dd/mm). Week start is configurable; default Sunday.

A native Android app could come later, but the PWA comes first.

---

## 2. Navigation

Bottom tab bar with 4 tabs: **Workout · Body · Targets · Log**.

Dark theme throughout, with a single bright accent colour of my choosing (not Fitbod pink). A large primary "Start Workout" button floats above the tab bar on the Workout and Log tabs.

---

## 3. Screens

### 3.1 Workout tab (today's workout)
- Header: avatar/initials + "My Plan" link
- Workout title (e.g. "Pull Day"), "X exercises • Y muscles"
- **Switch** button opens a sheet with:
  - Within training split: Push Day / Pull Day / Leg Day (radio), each with a highlighted body silhouette
  - Other options: Pick muscle groups, View saved workouts, Create workout from scratch, Import workout (JSON)
- Chips: duration (e.g. 1 hr) and gym profile (e.g. "Your Gym")
- Exercise list: thumbnail/icon, name, "3 sets • 10 reps • 50 kg", a progression arrow (↑ if weight/reps are going up from last time), and a ⋯ menu (replace, remove, reorder, set rest time, more/less often)
- Some sets can be marked **"Max Effort Day"** (work up to a heavy top set)
- Next workout in the split is suggested automatically, based on which split day was done least recently and on muscle recovery

### 3.2 Active workout
- Large running session timer with a record dot
- Same exercise list. Each row shows progress ("1/3 sets logged") and the current rest countdown.
- Completed exercises get a check badge
- **Finish Workout** button: saves the session and shows the summary (3.6)
- ✕ to discard (with confirmation)

### 3.3 Exercise logging screen
- Header area: exercise name + **How-To** button (shows my own text notes or cues, or opens an external link I've saved; no bundled video)
- Chips: rest time (e.g. 1:15), History, Replace, More
- Set rows: set number badge, Reps field, Weight (kg) field, pre-filled from the plan. The first unlogged set is highlighted. Logged sets turn the accent colour with a check.
- **Add Set**, **Log Set** (logs the current set and starts the rest timer), **Log All Sets**
- **Rest timer sheet:** big countdown, −10 s / +10 s buttons, pause, Done. Vibrate and play a sound at zero. It must keep counting correctly if the phone screen locks (use timestamps, not intervals).

### 3.4 Body tab
**Results sub-tab**
- **Overall strength score** (0–100), shown as a striped bar
- Push / Pull / Legs cards, each with a score and a trend badge (up/down). They expand to show sub-groups (Chest, Shoulders, Triceps / Back, Biceps / Quads, Hamstrings, Glutes, Calves), each with a score and a small sparkline.
- **Benchmark lifts:** cards for key lifts (e.g. Lat Pulldown) showing estimated 1RM, which open the exercise history screen

**Recovery sub-tab**
- "Last workout: X ago" and "Fresh muscles: N"
- Front/back body map (original SVG). Each muscle is coloured by recovery %, and there's a rotate button to flip front/back.
- Tap a muscle to see its recovery % and recent workouts that hit it
- Recovery % can be edited manually

### 3.5 Exercise history screen
- Range toggle: Week / Month / 6 Month / Year
- Big range label: "83–90.7 kg in 1 rep" plus the date range
- Line chart of estimated 1RM (one point per session, or monthly best for longer ranges)
- Personal record and average
- Table of past sessions (date, sets × reps × weight)

### 3.6 Workout summary / detail
- Title, date, duration
- Stats: calories (estimate), volume (kg), records (count with a trophy)
- Exercise list with sets logged
- For each exercise with a new PR, show a records panel: Weight PR and Est. 1RM PR
- Edit/delete the workout; add an exercise after the fact

### 3.7 Targets tab (weekly set targets)
- Week range (e.g. 8 Nov – 14 Nov)
- Large hexagon progress ring with overall %, in three coloured segments (push / pull / legs)
- Rows: Push / Pull / Leg muscles, "0 / 39 sets", "39 to go". They expand to per-muscle breakdowns.
- History: small hexagons for previous weeks with their %
- Targets are editable in My Plan. My current values are push 39, pull 21, legs 31.

### 3.8 Log tab
- Header stats: total workouts, milestones (badges), weekly goal (e.g. 0/4 days), current streak (weeks meeting the goal)
- Calendar: month view, with minutes trained shown under each day that had a workout. Collapsible to the current week.
- Past workouts timeline: date + duration, workout name, muscle icon, exercises / calories / volume, exercise names. Tap to open the detail (3.6).
- "+" to log a past workout manually

### 3.8a Milestones (opened from the Log header badges)
- Three tracks, each with a tiered hexagon badge showing the next target and the level number, plus a progress bar ("current / next target"):
  - **Volume:** lifetime kg lifted (shown in my chosen unit)
  - **Workouts:** lifetime workouts completed
  - **Calories:** lifetime estimated calories
- Tiers escalate (e.g. workouts 10 → 25 → 50 → 100 → 200 → 500 → 1000; volume and calories on similar steps). Each track's badge has its own colour.
- Show a short celebration when a new level unlocks at the end of a workout

### 3.9 My Plan (settings for training)
- Goal (Build Muscle, Strength, General Fitness, etc.)
- Injuries / limitations (free text + muscle/movement exclusions)
- Location / gym profiles: multiple profiles, each with a list of available equipment and a **bodyweight-only** toggle
- Training profile: workouts per week (4), duration (1 hr), experience (beginner/intermediate/advanced)
- Training format: split (Push/Pull/Legs, Upper/Lower, Full Body, custom), exercise variability (Low / Balanced / High), focus exercises, warm-up sets toggle, circuits & supersets toggle
- Preferences: units (kg/lb), cardio on/off, stretching on/off, start of week
- **Manage exercises:** searchable list with use count, a more/less often preference (↑ / ↓), edit, add a custom exercise

### 3.9a Workout Report (opened from Settings)
- **Muscle Strength:** swipeable cards, one per muscle (back, hamstrings, biceps, chest, etc.)
  - Each card: muscle name, current strength score, a line chart over Month / 6 Months / Year, and a faint muscle illustration highlighting that muscle
  - Scores recalculate weekly (on week start), not after every workout, so the line is smooth
- **Muscle Volume:** swipeable cards, one per muscle
  - Each card: total volume (kg) for the range and a monthly bar chart, with Week / Month / 6 Months / Year
  - Updates after every workout
- Page dots under each carousel
- Share button that saves a card as an image (with my app's name, not Fitbod's)

### 3.10 Settings
- Name
- Body profile (bodyweight, height, age, sex: used for calories and the strength score)
- Rest timer default, sound/vibration
- Export data (JSON), import data (JSON), import Fitbod CSV (see 6)
- Reset all data (with confirmation)

---

## 4. Data model (Dexie tables)

```ts
Exercise {
  id, name, category: 'push'|'pull'|'legs'|'core'|'other',
  primaryMuscles: Muscle[], secondaryMuscles: Muscle[],
  equipment: Equipment[], isBodyweight: boolean,
  defaultRestSec: number, howToNotes?: string, howToUrl?: string,
  preference: -1|0|1,          // less often / normal / more often
  isCustom: boolean, archived: boolean
}

WorkoutTemplate { id, name, splitDay?: 'push'|'pull'|'legs'|..., items: TemplateItem[] }
TemplateItem { exerciseId, sets, targetReps, targetWeightKg, restSec, maxEffort?: boolean, order }

WorkoutSession {
  id, name, templateId?, startedAt, endedAt, durationSec,
  gymProfileId, caloriesEst, volumeKg, notes?
}
SetLog {
  id, sessionId, exerciseId, setIndex, reps, weightKg,
  isWarmup: boolean, completedAt, e1rm
}

PersonalRecord { exerciseId, type: 'weight'|'e1rm'|'reps'|'volume', value, sessionId, date }
GymProfile { id, name, equipment: Equipment[], bodyweightOnly: boolean }
Settings  { singleton: units, weekStart, goal, experience, workoutsPerWeek, durationMin,
            split, variability, warmups, supersets, weeklySetTargets: {push, pull, legs},
            bodyweightKg, heightCm, age, sex, restDefaultSec }
RecoveryOverride { muscle, percent, setAt }
```

Muscles: chest, front delts, side delts, rear delts, triceps, biceps, forearms, lats, upper back, traps, lower back, abs, obliques, glutes, quads, hamstrings, adductors, abductors, calves.

---

## 5. Calculations

- **Estimated 1RM (Epley):** `e1rm = weight × (1 + reps / 30)`; for reps = 1, e1rm = weight. Ignore warm-up sets.
- **Volume:** Σ reps × weight across working sets
- **Calories (estimate):** MET × bodyweight(kg) × hours, with MET ≈ 3.5–5 for resistance training. A rough estimate is fine.
- **Records:** after each session, check every exercise for a new best weight, best e1RM, best reps at a weight, and best session volume
- **Progressive overload (double progression):**
  - Each exercise has a rep range (e.g. 8–12)
  - If every working set last time hit the top of the range, increase the weight by the smallest increment (dumbbells 1–2 kg, cable/machine 2.5–5 kg, barbell 2.5 kg) and reset the reps to the bottom of the range
  - Otherwise keep the weight and aim for +1 rep on at least one set
  - If performance drops two sessions in a row, suggest a small deload (−10%)
- **Muscle recovery:**
  - Each logged working set adds fatigue to its primary muscles (1.0) and secondary muscles (0.5)
  - Recovery time scales with fatigue: about 48 h for a light dose, up to 72–96 h for a high dose
  - Recovery % = min(100, hours since last trained ÷ required hours × 100)
  - "Fresh" = 90% or more. Manual overrides win until the next workout.
- **Weekly set targets:** count working sets per muscle group (primary = 1, secondary = 0.5) from week start; % = done ÷ target, capped at 100
- **Strength score (my own, not Fitbod's mStrength):**
  - Per exercise: ratio = current best e1RM (last 4 weeks) ÷ baseline e1RM (first 4 weeks logged)
  - Per muscle: mean ratio across exercises where it's primary, mapped to 0–100 with 50 = baseline (e.g. score = clamp(50 × ratio, 0, 100))
  - Group and overall scores are averages; the trend badge compares against the score 4 weeks ago
  - Easy to tune later
- **Workout generation (simple version first):**
  - Pick the split day due next
  - Fill from my exercises for that day's muscles, favouring higher preference, fresher muscles and the available equipment, and fit to the duration (about 6–8 min per exercise including rest)
  - Variability setting controls how often exercises rotate between sessions
- **Streak:** consecutive weeks hitting the workouts-per-week goal

---

## 6. Importing my Fitbod history

I have about 206 logged workouts. If Fitbod lets me export my history (CSV), build an importer that maps its exercise names onto my exercise list, creates sessions and set logs, and recalculates PRs, e1RM and the strength baseline.

If there's no export, start fresh and seed the current working weights below.

Either way, seed the lifetime milestone totals so my progress carries over:
- Workouts: 206
- Volume: 2,055,036 lb (≈ 932,150 kg)
- Calories: 34,468

---

## 7. Seed exercise list (my actual exercises, with use counts)

| Exercise | Uses | Category | Primary muscles | Equipment |
|---|---|---|---|---|
| Cable Tricep Pushdown | 82 | push | triceps | cable |
| Cable Row | 64 | pull | upper back, lats | cable |
| Lat Pulldown | 63 | pull | lats | cable |
| Single Arm Preacher Curl | 58 | pull | biceps | dumbbell, preacher bench |
| Dumbbell Bench Press | 53 | push | chest | dumbbell, bench |
| Dumbbell Lateral Raise | 46 | push | side delts | dumbbell |
| Incline Dumbbell Curl | 44 | pull | biceps | dumbbell, bench |
| Dumbbell Skullcrusher | 39 | push | triceps | dumbbell, bench |
| Seated Dumbbell Curl | 36 | pull | biceps | dumbbell, bench |
| Hammerstrength Iso Row | 33 | pull | upper back, lats | plate-loaded machine |
| Machine Fly | 33 | push | chest | machine |
| Seated Leg Curl | 32 | legs | hamstrings | machine |
| Hammerstrength Shoulder Press | 31 | push | front delts | plate-loaded machine |
| Leg Extension | 31 | legs | quads | machine |
| Dumbbell Lunge | 30 | legs | quads, glutes | dumbbell |
| Hammerstrength Chest Press | 30 | push | chest | plate-loaded machine |
| Leg Press | 25 | legs | quads, glutes | machine |
| Calf Raise | 20 | legs | calves | machine |
| Barbell Curl | 17 | pull | biceps | barbell |
| Cable Face Pull | 17 | pull | rear delts, upper back | cable |
| Dumbbell Incline Bench Press | 16 | push | chest, front delts | dumbbell, bench |
| Machine Bench Press | 16 | push | chest | machine |
| Machine Shoulder Press | 13 | push | front delts | machine |
| Hammer Curls | 12 | pull | biceps, forearms | dumbbell |
| Crunches | 11 | core | abs | bodyweight |
| Cable Lateral Raise | 9 | push | side delts | cable |
| Back Extensions | 7 | pull | lower back, glutes | back extension bench |
| Preacher Curl | 6 | pull | biceps | barbell/EZ-bar, preacher bench |
| Assisted Pull Up | 5 | pull | lats | assisted machine |

Less-used ones to include (1–2 uses): Concentration Curl, Dumbbell Bent Over Row, Dumbbell Walking Lunge, Hip Thrust, Plank, Sit Up, Standing Dumbbell Calf Raise, Arnold Dumbbell Press, Cable Bicep Curl, Cable Rope Overhead Triceps Extension, Dumbbell Fly, Dumbbell Front Raise, Dumbbell Romanian Deadlift, Dumbbell Shrug, Dumbbell Squat, Dumbbell Standing Front Press, EZ-Bar Curl, Hanging Knee Raise, Lying Hamstrings Curl, Machine Rear Delt Fly, Push Up, Single Arm Dumbbell Tricep Extension, Waiter Curls.

Fill in secondary muscles sensibly (e.g. bench press → front delts and triceps; rows → biceps and rear delts; lunges → hamstrings).

### Current working weights (from recent sessions)
- Cable Row 3 × 10 @ 50 kg
- Incline Dumbbell Curl 3 × 10 @ 12 kg
- Single Arm Preacher Curl 3 × 10 @ 10.5 kg
- Hammerstrength Iso Row 3 × 12 @ 30 kg
- Barbell Curl 3 × 12 @ 22.5 kg
- Lat Pulldown 4 sets, max effort (est. 1RM about 85 kg; PR 90.7 kg)
- Dumbbell Lunge 2 × 8 @ 15 kg
- Calf Raise 2 × 12 @ 85 kg
- Leg Extension 2 × 10 @ 50 kg

### Current split templates
- **Pull Day:** Cable Row, Incline Dumbbell Curl, Lat Pulldown (max effort), Single Arm Preacher Curl, Hammerstrength Iso Row, Barbell Curl (+1 more)
- **Push Day:** Dumbbell Incline Bench Press, Cable Tricep Pushdown, Hammerstrength Shoulder Press (+ lateral raise, fly and skullcrusher as rotation options)
- **Leg Day:** Dumbbell Lunge, Calf Raise, Leg Extension (+ seated leg curl and leg press)

---

## 8. Out of scope (for now)

- Exercise demo videos/photos (use my own notes or links instead)
- Health Connect / Strava / wearable sync (possible later with a native Android build)
- AI form check, "ask a trainer", social sharing, "top X% of people like you" comparisons
- Accounts, logins, subscriptions, cloud sync

---

## 9. Build order

1. **Core logging:** exercise list, templates, active workout, set logging, rest timer, finish + summary, local storage, JSON export/import
2. **Log tab:** stats, calendar, past workouts, workout detail with PRs
3. **Progress:** exercise history charts, e1RM, PRs, benchmark lifts
4. **Targets tab:** weekly set targets + hexagon ring + history
5. **Recovery:** body map SVG + recovery model
6. **Strength score:** Body > Results, plus the Workout Report (muscle strength and muscle volume carousels)
7. **My Plan:** gym profiles, split settings, manage exercises, auto-generated next workout + progressive overload
8. **Polish:** PWA install/offline, milestones, streaks, Fitbod CSV import

Test each stage on my phone at the gym before moving on.
