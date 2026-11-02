# Humo AI

The exam platform of **Humo AI** (Tashkent, since 2020): Digital SAT and IELTS practice with **Humo**, a golden 3D AI tutor.

## What's inside

| Route | What it is |
|---|---|
| `/` | Landing page with a real-time 3D Humo (Three.js / React Three Fiber), live "try a question" demo, features, pricing, FAQ |
| `/login`, `/signup` | Google sign-in + email auth, 3D Humo on the side |
| `/privacy`, `/terms` | Privacy Policy and Terms of Service (needed for Google publishing) |
| `/app` | Home: score goal + predicted SAT range, exam countdown, streak, analytics strip, daily question, today's plan, live 3D Humo |
| first visit | Animated onboarding: aim, target, SAT date, level, weak skills, schedule → Humo builds the first plan |
| `/app/plan` | Editable weekly plan (add, remove, reorder, minutes), "Ask Humo to change it", Google Calendar export (.ics + per-day links) |
| `/app/humo` | Ask Humo with saved chat history (search, pin, rename); Desmos solves with checked Desmos screens; plan proposals with Apply |
| `/app/desmos` | Desmos Lab: 132 verified hard Math questions, hint ladder, live Desmos, Humo's Desmos screen |
| `/app/settings` | Profile, SAT goal, schedule, Humo language/style, reminders, export/import, reset, delete account |
| `/app/tests` · `/app/papers` | 10 original practice tests (476 Qs) → Exam / Practice / Sprint; exam-paper shelf + official Bluebook link |
| `/app/tests/:id/take` | Bluebook-style runner: module timer, mark for review, eliminator, navigator, Desmos calculator + reference sheet (Math), Humo hints in practice mode |
| `/app/results/:id` | Score, skills weakest-first, answer map, Humo explanation above every question, save questions, Ask Humo drawer |
| `/app/drills` | 5/10/20-question drills by section or by skill, instant Humo explanations |
| `/app/vocab` | 120 SAT words + students' own words; Daily 20, 4-type quiz, Spell-it, SM-2 flashcards |
| `/app/lessons` | Strategy lessons → drill the matching skill / ask Humo |
| `/app/analytics` · `/app/results` · `/app/mistakes` · `/app/calculator` | Accuracy by section and skill, pacing, trend, heatmap; results history; saved & mistakes; score calculator |
| Everywhere | Floating **Ask Humo** button that knows the page and the student's goals |

Brand follows [step12.uz](https://step12.uz): navy `#03244a`, crimson `#bb0937` (UI scale `jg-*` in `src/index.css`), Literata + Onest. The AI tutor is Humo.

## Run locally

```bash
npm install
cp .env.example .env          # server settings
cp .env.example .env.local    # frontend settings (only VITE_* is used)
npm run dev:all               # web on :5173, API on :3001
```

`npm run dev` runs the frontend alone — everything still works in demo mode (Google button opens a demo account, Humo shows an offline notice).

## Google sign-in

Already configured: the public OAuth client ID is committed in `.env.development` / `.env.production` and used by the server as a fallback.

- While the Google consent screen is in **Testing**, only accounts added under Google Auth Platform → Audience → Test users can sign in.
- To open sign-in to everyone: deploy, add the production domain to the client's **Authorized JavaScript origins**, then click **Publish app** (links to `/privacy` and `/terms` are ready for the consent screen).

Flow: the browser gets a Google access token → `POST /api/auth/google` → the server checks the token belongs to our client ID, reads the verified profile, and returns a 30-day JWT.

## Desmos solves

The `desmos-sat-coach` skill lives in `server/skills/`. Humo writes a Desmos spec (lines + formulas); `server/desmos.js` recomputes every number with mathjs, checks each point lies on its curve and that the answer is shown, asks Gemini to fix anything that fails, and only then returns the screen. `shared/desmos-render.js` draws it as SVG (same renderer on server and browser). The live calculator uses Desmos's demo key; set `VITE_DESMOS_API_KEY` to the site's own free key from desmos.com/api.

## Turn on live Humo

Set `GEMINI_API_KEY` (free at aistudio.google.com; optionally `GEMINI_MODEL`) in `.env`, then restart the API. Per-question explanations are generated once and cached in `server/data/explanations.json`, so every later student gets them instantly and at no cost. Humo's persona is in `server/index.js` (`HUMO_SYSTEM`).

## Before production

- Set a long random `JWT_SECRET`.
- Replace the JSON user store (`server/data/users.json`) with Postgres.
- Require auth + rate-limit `/api/chat`.
- Pricing, FAQ and university list are plain arrays in `src/landing/Sections.tsx`.

## Structure

```
src/
  three/      HumoBird.tsx (procedural 3D bird), HumoScene.tsx (lights, halo, bloom, scroll rig)
  landing/    Landing, TryHumo, Features, Sections
  auth/       AuthPage, GoogleButton
  app/        AppShell (dashboard, Humo chat, practice, mock)
  lib/auth.tsx
server/index.js   Express: Google auth, email auth, JWT, Gemini chat
```

SAT® is a trademark of the College Board; IELTS™ is owned by the British Council, IDP and Cambridge University Press & Assessment. Neither endorses this product.
