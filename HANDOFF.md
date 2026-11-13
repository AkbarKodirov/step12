# Humo AI — handoff notes

The current state of the project, written for whoever continues the work. Read this before changing anything.

## What it is
Humo AI is a Digital SAT prep platform for **Humo AI** in Tashkent. Its AI tutor is **Humo**, a golden 3D bird powered by Google Gemini.
- Repo: `AkbarKodirov/jamals-ai` (branch `main`).
- Live at https://step12.onrender.com (Render service "step12"; repo AkbarKodirov/step12). Render's free plan auto-deploys every push to `main` in about 3–5 minutes.
- The owner is Akbarjon. He writes casually ("bro") and wants a polished, OnePrep-quality product.
- Students use phones a lot, so every change must work at a 390px width.

## Stack
- **Frontend:**
  - React 19, Vite 8, TypeScript, Tailwind v4 (tokens declared with `@theme` in `src/index.css`), framer-motion, lucide-react.
  - react-router 7; three / R3F draws the 3D Humo.
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
- **Ask Humo chat:** `src/app/pages/HumoChat.tsx`, with `space` set to `humo` or `desmos`. Histories are stored separately and photos can be uploaded.
  - Replies stream (`/api/chat` with `stream: true` answers in NDJSON lines). `chatContents()` in `server/index.js` cleans the history (starts with the student, roles alternate, error notes dropped, last 12 turns, photos only on the last two), and a history Gemini refuses is retried once as a single transcript.
  - **Desmos Lab accuracy:** before Humo writes, `verifiedAnswer()` solves the latest question twice in parallel (high thinking + Gemini code execution, which plugs the answer back in with Python). If the two disagree a third solve decides. The checked answer goes into the system prompt and is the `expect` value for the Desmos screen check, and screen repairs get up to 2 tries. It costs 3–4 Gemini calls per Desmos Lab question. For speed the check waits at most 25 s for the two solves (then uses what arrived; if nothing arrived it waits up to 35 s more for the first one) and 12 s for the tie-breaker. With no agreed checked answer, the reply is written with high thinking; screen repairs time out after 15 s, and a typed message with no photo and no numbers ("teach me list regression") skips the check. On 8 very hard bank questions (half as photos) it went from 7/8 to 8/8 correct.
  - Gemini calls skip a model for 60 s after a 503/429/timeout. Streams time out after 5 s without first words, solver calls after 35 s.
  - Chat runs with `thinkingLevel: low` for speed (`GEMINI_CHAT_THINKING` overrides it); a model that rejects it is retried without it.
- **Floating Humo:** `src/app/components/HumoFab.tsx`. It can see the screen through `src/app/screen.ts`.
- **Greetings:** 20 rotating greetings in `src/app/greetings.ts`.
- **Practice tests:** `public/tests/index.json` plus one `<id>.json` per test, shown by `src/app/pages/Tests.tsx` and run by `TakeTest.tsx`.
  - Every test is named "Practice Test N".
  - Reading & Writing: Practice Test 1–16, each 2 modules × 27 = 54 questions. Names come from `index.json` order; ids never change (results, mistakes and saved questions are keyed by id), and `syncTestNames()` in `src/app/store.ts` updates the names on old results.
  - Practice Test 1–3 (`pt15`, `pt16`, `pt14`: real-exam questions) are free; `FREE_TESTS` in `shared/plans.js`. Every other test is Pro, with an "Unlock with Pro" button on its card.
  - Math: so far only Practice Test 1 (`math-pt1`), 2 modules × 22 = 44 questions.
  - `scripts/restructure-tests.mjs` rebuilds the index and pairs single modules. It predates the free-test renumbering and does not know `pt14`–`pt16`, so don't run it without updating it first.
- **Question bank:** `public/bank/bank.json` (3,166 questions, including 2,092 original Reading & Writing questions from `scripts/cache/rw-originals.json`; every topic has at least 10 Easy, 10 Medium and 10 Hard), shown by `src/app/practice/QBank.tsx` and run by `Runner.tsx` at `/app/practice/run`.
  - Topics follow the 29 OnePrep / College Board topics in `shared/topics.js`.
  - Built by `scripts/gen-bank.mjs` (Gemini). Questions written without Gemini go in `scripts/cache/bank-additions.json` and are appended by `node scripts/add-bank.mjs` (pass file names, e.g. `node scripts/add-bank.mjs rw-originals.json`, to add only those files); each one was solved again by a separate checker and kept only if the answers matched.
  - It must never contain practice-test or exam-paper questions.
- **Learn courses:** `src/app/learn/` (SAT Reading & Writing; Math & Desmos).
- **Other pages:** Saved & mistakes (`Mistakes.tsx`), Settings (tabs; light, dark or system theme; no score editing), Analytics, Vocabulary, Blitz, Exam papers, Score calculator.
- **Desmos:**
  - `server/desmos.js` builds screens and validates them with mathjs.
  - `shared/desmos-render.js` renders them as SVG.
  - Desmos Lab is a Humo chat where students upload a picture of a question.
- **Styling:**
  - Dark mode works by overriding CSS variables on `html.dark-app`; `.theme-light` pins regions that must stay light.
  - Scrollbars are invisible but scrolling still works.
- **Logo:** `public/humo-mark.png` / `humo-mark-512.png` (the brightened version).

## Content rules (important)
- Prefer Humo AI's own original sets and newly generated original questions.
- **Real exam / College Board / Bluebook / SAT League / prediction questions** may be imported **only** when the owner (Akbar) explicitly requests them in the current chat or PR description. When he does, treat that as approval and proceed.
- Do not add them proactively or when the request is vague.
- The "Official College Board questions" card was removed from the question bank at the owner's request (do not restore it unless asked).
- Every generated (non-imported) question still goes through `scripts/gen-*.mjs`: Gemini writes it, then solves it again without the key, and only questions where both answers agree are kept.
- Geometry figures are drawn from a JSON shape spec by `scripts/figure.mjs`. `scripts/check-figures.mjs` compares each figure with its question; it removes or redraws any that don't match.

## Unfinished work
1. **Math Practice Tests 2–6**
   - Run `node --env-file=.env scripts/gen-tests.mjs 6` in the background. It resumes from `scripts/cache/tests-gen.json`, which is committed so progress carries over.
   - Then run `node --env-file=.env scripts/check-figures.mjs` and `node scripts/restructure-tests.mjs`.
   - Spot-check a few questions and figures, build, commit and push.
   - Stopped because the Gemini free tier allows only about 20 requests per model per day, and the live Humo shares the same key. Don't use up the quota students need: ask the owner for a billed key or a separate key for generation first.
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
- `server/groq.js`: when every Gemini model is busy or out of free quota, Humo answers through Groq (free tier, ~1,000 requests/day). Text uses `openai/gpt-oss-120b`; requests with photos use `qwen/qwen3.8-27b`. Key: `GROQ_API_KEY` (also read as `Groq_API_KEY`) on Render. `/api/health` shows `groq: true` when the key is set.
- `.github/workflows/keep-awake.yml` pings the site every 10 minutes so Render's free plan never sleeps.
- `server/retrieve.js` ("Humo memory"): indexes every bank and practice-test question (~3,900) at startup. When a student pastes or views one, `/api/chat` adds its checked answer + explanation to the system prompt, so Humo never contradicts Humo AI's key. Word-statistics matching, no AI calls; tested 299/300 exact, 0 wrong, 0 false positives.

## Oct 22 afternoon (Humo AI rebrand + Humo upgrades)
- Brand is **Humo AI** (navy #03244a + crimson #bb0937) and the AI is **Humo** (ensō mark, `src/three/HumoCore.tsx`). Internal file/variable names still say `humo`. Storage keys are now `humo.session` / `humo.progress.<email>`; older `step12.*` and `jamals.*` keys are read once and moved over (keep that fallback).
- Backups: `server/groq.js` chains Groq → OpenRouter → DeepSeek (DeepSeek only if `DEEPSEEK_API_KEY` is set). GitHub Models was retired by GitHub on 30 Jul 2026 — don't add it back.
- Humo gets `recent` (last-14-day bank answers) from the client and `practiceSummary()` turns it into per-skill accuracy in the system prompt.
- Chat: Copy / Answer again / Try again, Stop (also stops generation on the server), voice input (Web Speech API).
- `scripts/eval-humo.mjs` — 12 new questions, run against a local server after prompt/model changes (was 12/12).
- Site: Open Graph preview (`public/og.png`), installable manifest, robots/sitemap, year-long cache for `/assets/*`, per-page tab titles, server self-ping on Render.
- Content rule reminder: no College Board / Bluebook / real-exam / SAT League book items (the book says its questions come from the CB bank).
- Exception the owner approved on 31 Oct 2026: Practice Test 14 (pt14) is SAT League Practice Test #1, imported on his explicit instruction after the rule was flagged. Four of its items are already in the bank as Professor IV questions.

## Oct 27 (Desmos Lab)
- `prepareScreen` refuses answer-only lines like "n = 2" (a letter used nowhere else); a solution count is shown by marking each intersection as a point. Reply shape is 7 steps, the screen sits unnumbered after "Type this". `parseSpec()` escapes LaTeX the AI forgets to escape. Scorecard 12/12.
- Weak spot: "find the constant k" screens don't always match the typed line.
- Nov 13: when the double-check has no agreed answer (often photos), `finishReply` checks the screen against the reply's own bold Answer (`statedAnswer`), so a screen can't show a different number from the answer. The prompt also forbids "Wait, no…" self-corrections.
- Nov 13: if a Desmos Lab reply has no usable desmos block (plain code, missing, refused), `finishReply(..., { screen: true })` builds one with `buildDesmos` and puts it under "Type this".
- Nov 13: Desmos Lab chat uses `mistral: 'last'` (Gemini first, Mistral when Gemini is busy): Ministral 14B wrote messy self-correcting Desmos solutions. Ask Humo still uses Mistral first.

## Nov 3 (video lessons)
- Learn pages were redesigned: navy hero with the featured video, filter chips, lesson cards with posters, and a video lesson page with Humo's own player (`src/app/learn/VideoPlayer.tsx`), chapters, and a 5-question Mastery Check (`Mastery.tsx`, pass 4/5).
- Video data lives in `src/app/learn/videos.ts` (keyed by the lesson id in `courses.ts`): slug, duration, chapters (from `chapters.json` next to each render in project files), Mastery questions (original). `VIDEO_SOON` marks lessons whose videos are in production.
- Videos are NOT in git. They are on Cloudflare R2, bucket `humo-lessons`, public at `https://pub-74c3fe78d2fd419fbb39853077b9141c.r2.dev/lessons/<slug>/<slug>-720p.mp4` (also `-1080p.mp4`, `-poster.jpg`). Uploads use the R2 S3 API (curl `--aws-sigv4`); the keys are the owner's and are never committed. Remux with `-movflags +faststart` before uploading.
- The store has `lessonVideo` (resume position) and `mastery` (best score). Watching 90% marks a lesson done.

## Nov 4 (Free and Pro plans, admin panel)
- Plans live in `shared/plans.js` (price 149 000 so'm ≈ $12, Free limits, Pro-only pages, feature copy) and `server/billing.js`.
- **Free:** full question bank + 1 Ask Humo question and 1 Desmos Lab solve per day (Tashkent day). Checked on the server in `/api/chat` (402 `code: "limit"`); a failed answer gives the question back. Floating Humo and question-bank Humo count as Ask Humo. `/api/plan` (study plan edits) is Pro only.
- **Pro-only pages:** tests, results, papers, vocab, blitz, mistakes, plan, learn, analytics, calculator (`ProGate` in `AppShell.tsx` shows `ProLock`). Test JSON files are still public static files; only the UI locks them.
- `jobirovich.akbarjon@gmail.com` is always Pro (`ALWAYS_PRO`). The only admin is `akbarjon160609@gmail.com` (`ADMINS`); nobody else sees the admin panel link or can use `/api/admin/*`.
- User record field `pro: { until, source, by, at }`.
- The admin never sees the student app: `AppShell` renders `src/app/pages/Admin.tsx` instead (its own sidebar / bottom nav). Pages: Overview (`/app`, stats, 14-day charts, newest students), Students (`/app/students`, search, make any email Pro 30 d / 90 d / 1 y / no end date, even before sign-up, or Free), Payments (`/app/payments`, card payments + Pro activity), Plans & settings (`/app/plans`, price, limits, Stripe/Telegram status). Data: `GET /api/admin/users`.
- Go Pro is a pop-up (`src/app/components/UpgradeModal.tsx`, opened with `openUpgrade()` from `account.ts`): plan card → payment cards (Visa / Telegram manager) → Telegram steps, X closes. `/app/upgrade` only opens the pop-up (Stripe returns there with `session_id`). Visa: Stripe Checkout when `STRIPE_SECRET_KEY` is set (one-off $12 for 30 days, no auto-renew; confirmed on return and optionally by webhook), or `CARD_PAYMENT_URL`. Click/Payme/etc.: Telegram manager link from `TELEGRAM_MANAGER` env or the constant in `shared/plans.js` (empty until the owner sends it).
- Client plan state: `src/app/account.ts` (`GET /api/account`).
