# STEP12 — handoff notes

The current state of the project, written for whoever continues the work. Read this before changing anything.

## What it is
STEP12 is a Digital SAT prep platform for **STEP12** in Tashkent. Its AI tutor is **Sensai**, a golden 3D bird powered by Google Gemini.
- Repo: `AkbarKodirov/jamals-ai` (branch `main`).
- Live at https://step12.onrender.com (Render service "step12"; repo AkbarKodirov/step12). Render's free plan auto-deploys every push to `main` in about 3–5 minutes.
- The owner is Akbarjon. He writes casually ("bro") and wants a polished, OnePrep-quality product.
- Students use phones a lot, so every change must work at a 390px width.

## Stack
- **Frontend:**
  - React 19, Vite 8, TypeScript, Tailwind v4 (tokens declared with `@theme` in `src/index.css`), framer-motion, lucide-react.
  - react-router 7; three / R3F draws the 3D Sensai.
  - Run with `npm run dev`; `npm run build` runs `tsc && vite build`.
- **Backend:** Express in `server/index.js`, which serves `dist/` and the API. Locally: `PORT=3011 node server/index.js` after a build.
- **AI:** `@google/genai` with a model fallback list (`GEMINI_MODELS` in `server/index.js`). The key is `GEMINI_API_KEY` in `.env` (git-ignored; never commit it or print it).
- **Storage:** `server/kv.js` uses Postgres (Neon) when `DATABASE_URL` is set, otherwise JSON files in `server/data/kv`.
  - Production uses Neon; `GET /api/health` returns `storage: "postgres"`.
  - Users are keyed by email with deterministic ids: `u_` + sha256(email).slice(0, 24).
  - Logins use a JWT that lasts 60 days.
- **Client store** (`src/app/store.ts`):
  - Keeps a localStorage copy per user, keyed by email.
  - Syncs with the cloud via `GET/PUT /api/progress` after a 4 s debounce. On a 409 conflict the server copy wins. Images are stripped from the cloud copy.
  - `AppShell` waits for that sync before deciding whether to show onboarding, so returning users never see the setup questions again.
- **Auth:**
  - Email/password.
  - Google via `@react-oauth/google`. The popup is tried first and a full-page redirect is the fallback: `/auth/google` → `src/auth/GoogleCallback.tsx`.
  - The redirect URIs are registered in Google Cloud.

## Main features (where they live)
- **Ask Sensai chat:** `src/app/pages/HumoChat.tsx`, with `space` set to `humo` or `desmos`. Histories are stored separately and photos can be uploaded.
  - Replies stream (`/api/chat` with `stream: true` answers in NDJSON lines). `chatContents()` in `server/index.js` cleans the history (starts with the student, roles alternate, error notes dropped, last 12 turns, photos only on the last two), and a history Gemini refuses is retried once as a single transcript.
  - **Desmos Lab accuracy:** before Sensai writes, `verifiedAnswer()` solves the latest question twice in parallel (high thinking + Gemini code execution, which plugs the answer back in with Python). If the two disagree a third solve decides. The checked answer goes into the system prompt and is the `expect` value for the Desmos screen check, and screen repairs get up to 2 tries. It costs 3–4 Gemini calls per Desmos Lab question. On 8 very hard bank questions (half as photos) it went from 7/8 to 8/8 correct.
  - Gemini calls skip a model for 60 s after a 503/429/timeout. Streams time out after 10 s without first words, solver calls after 35 s.
  - Chat runs with `thinkingLevel: low` for speed (`GEMINI_CHAT_THINKING` overrides it); a model that rejects it is retried without it.
- **Floating Sensai:** `src/app/components/HumoFab.tsx`. It can see the screen through `src/app/screen.ts`.
- **Greetings:** 20 rotating greetings in `src/app/greetings.ts`.
- **Practice tests:** `public/tests/index.json` plus one `<id>.json` per test, shown by `src/app/pages/Tests.tsx` and run by `TakeTest.tsx`.
  - Every test is named "Practice Test N".
  - Reading & Writing: Practice Test 1–13, each 2 modules × 27 = 54 questions.
  - Math: so far only Practice Test 1 (`math-pt1`), 2 modules × 22 = 44 questions.
  - `scripts/restructure-tests.mjs` rebuilds the index and pairs single modules.
- **Question bank:** `public/bank/bank.json` (3,166 questions, including 2,092 original Reading & Writing questions from `scripts/cache/rw-originals.json`; every topic has at least 10 Easy, 10 Medium and 10 Hard), shown by `src/app/practice/QBank.tsx` and run by `Runner.tsx` at `/app/practice/run`.
  - Topics follow the 29 OnePrep / College Board topics in `shared/topics.js`.
  - Built by `scripts/gen-bank.mjs` (Gemini). Questions written without Gemini go in `scripts/cache/bank-additions.json` and are appended by `node scripts/add-bank.mjs` (pass file names, e.g. `node scripts/add-bank.mjs rw-originals.json`, to add only those files); each one was solved again by a separate checker and kept only if the answers matched.
  - It must never contain practice-test or exam-paper questions.
- **Learn courses:** `src/app/learn/` (SAT Reading & Writing; Math & Desmos).
- **Other pages:** Saved & mistakes (`Mistakes.tsx`), Settings (tabs; light, dark or system theme; no score editing), Analytics, Vocabulary, Blitz, Exam papers, Score calculator.
- **Desmos:**
  - `server/desmos.js` builds screens and validates them with mathjs.
  - `shared/desmos-render.js` renders them as SVG.
  - Desmos Lab is a Sensai chat where students upload a picture of a question.
- **Styling:**
  - Dark mode works by overriding CSS variables on `html.dark-app`; `.theme-light` pins regions that must stay light.
  - Scrollbars are invisible but scrolling still works.
- **Logo:** `public/humo-mark.png` / `humo-mark-512.png` (the brightened version).

## Content rules (important)
- **No College Board, Bluebook, real-exam or "prediction" questions** may be imported or copied. The owner has asked for them before, and the answer is always no because of copyright.
- Only STEP12's own original sets, or new original questions, are allowed.
- The "Official College Board questions" card was removed from the question bank at the owner's request.
- Every generated question goes through `scripts/gen-*.mjs`: Gemini writes it, then solves it again without the key, and only questions where both answers agree are kept.
- Geometry figures are drawn from a JSON shape spec by `scripts/figure.mjs`. `scripts/check-figures.mjs` compares each figure with its question; it removes or redraws any that don't match.

## Unfinished work
1. **Math Practice Tests 2–6**
   - Run `node --env-file=.env scripts/gen-tests.mjs 6` in the background. It resumes from `scripts/cache/tests-gen.json`, which is committed so progress carries over.
   - Then run `node --env-file=.env scripts/check-figures.mjs` and `node scripts/restructure-tests.mjs`.
   - Spot-check a few questions and figures, build, commit and push.
   - Stopped because the Gemini free tier allows only about 20 requests per model per day, and the live Sensai shares the same key. Don't use up the quota students need: ask the owner for a billed key or a separate key for generation first.
2. **Possibly:** make Google sign-in on phones use the full-page redirect by default instead of the popup.
3. **Possibly:** the owner may want the per-topic "Official ↗" College Board links in the question bank removed (not asked yet).

## Working habits that worked
- After a change: `npm run build`, then check the page in Playwright.
  - Chromium is at `/opt/pw-browsers/chromium`; `npm i --no-save playwright` if it's missing.
  - Save greyscale, cropped screenshots.
- Commit in small pieces and push to `main`. Commit messages are plain English.
- Live-site JSON (tests and bank) is fetched with `cache: 'no-cache'` and served with `Cache-Control: no-cache`, so content updates show up immediately.
- Don't kill processes with `pkill -f server/index.js` (it also killed the shell); run the server as a background task.

## AI backup (added Oct 22)
- `server/groq.js`: when every Gemini model is busy or out of free quota, Sensai answers through Groq (free tier, ~1,000 requests/day). Text uses `openai/gpt-oss-120b`; requests with photos use `qwen/qwen3.8-27b`. Key: `GROQ_API_KEY` (also read as `Groq_API_KEY`) on Render. `/api/health` shows `groq: true` when the key is set.
- `.github/workflows/keep-awake.yml` pings the site every 10 minutes so Render's free plan never sleeps.
- `server/retrieve.js` ("Sensai memory"): indexes every bank and practice-test question (~3,900) at startup. When a student pastes or views one, `/api/chat` adds its checked answer + explanation to the system prompt, so Sensai never contradicts STEP12's key. Word-statistics matching, no AI calls; tested 299/300 exact, 0 wrong, 0 false positives.

## Oct 22 afternoon (STEP12 rebrand + Sensai upgrades)
- Brand is **STEP12** (navy #03244a + crimson #bb0937) and the AI is **Sensai** (ensō mark, `src/three/SensaiCore.tsx`). Internal file/variable names still say `humo`. Storage keys are now `step12.session` / `step12.progress.<email>`; old `jamals.*` keys are read once and moved over (keep that fallback).
- Backups: `server/groq.js` chains Groq → OpenRouter → DeepSeek (DeepSeek only if `DEEPSEEK_API_KEY` is set). GitHub Models was retired by GitHub on 30 Jul 2026 — don't add it back.
- Sensai gets `recent` (last-14-day bank answers) from the client and `practiceSummary()` turns it into per-skill accuracy in the system prompt.
- Chat: Copy / Answer again / Try again, Stop (also stops generation on the server), voice input (Web Speech API).
- `scripts/eval-sensai.mjs` — 12 new questions, run against a local server after prompt/model changes (was 12/12).
- Site: Open Graph preview (`public/og.png`), installable manifest, robots/sitemap, year-long cache for `/assets/*`, per-page tab titles, server self-ping on Render.
- Content rule reminder: no College Board / Bluebook / real-exam / SAT League book items (the book says its questions come from the CB bank).

## Oct 27 (Desmos Lab)
- `prepareScreen` refuses answer-only lines like "n = 2" (a letter used nowhere else); a solution count is shown by marking each intersection as a point. Reply shape is 7 steps, the screen sits unnumbered after "Type this". `parseSpec()` escapes LaTeX the AI forgets to escape. Scorecard 12/12.
- Weak spot: "find the constant k" screens don't always match the typed line.
