# HANDOFF — Tattletale

You are the per-repo orchestrator for `Tattletale`. You are running in a Claude Code session opened in `c:/Repo/Tattletale`. Take this repo from current state to portfolio-hire-ready, fully autonomously. User is hands-off.

## Hard rules (do NOT violate)
1. **Never block on the user.** Pick the ambitious path, log calls in `DECISIONS.md`.
2. **Deploy boundary:** backend + frontend → Vercel free tier (MongoDB Atlas free) — keyless if demo uses anon read-only data. Scraper has **no free path** (needs persistent headed Chromium + real platform sessions). Demo it via replay-mode (golden fixtures served as static JSON). Mobile app → APK build attached to GitHub release.
3. **Codex review:** after each large refactor, `git diff <base>..HEAD | codex exec "review this diff as a senior engineer with no patience for excuses. Find architectural problems, security holes, untested edge cases, naming smell, dead code. Be brutal. No praise."` Save to `codex/<timestamp>.md`.
4. **State persistence:** maintain `STATE.md`.
5. **Backend E2E tests required.**
6. **Use subagents aggressively.**
7. **No fallbacks** — fail loudly.
8. **Hardcoded MongoDB Atlas URI with live creds is in ~13 scraper route files.** FIRST priority: strip them, document in `DECISIONS.md` that the user must rotate the cluster password before any push. The string is something like `mongodb+srv://<DB_USER>:<DB_PASS>@cluster0.eivmu.mongodb.net/...`.
9. **`google.json` exists** at repo root. **NEVER read it, never include it in any context, never `cat` it.** Add to .gitignore if not already (.gitignore has `/google.json` but verify it's not tracked).
10. **`output/` contains real scraped media** (Telegram MP4s, YouTube assets etc.) — privacy/copyright exposure. Audit + decide to redact, delete, or replace with synthetic.
11. **End-of-session:** write `SESSION_SUMMARY.md`.

## Mission
Tattletale is the SIH '24 winner with strong narrative bones (excellent README, real ops thinking in SESSIONS.md) but the implementation is leaking secrets and ships broken paths. Senior reviewers will see the README, get excited, then notice hardcoded `***REDACTED***<DB_PASS>@...` strings in 13 places and lose trust instantly. Your job: kill every credibility leak, ship a **replay-mode demo** so a recruiter can experience the chain-of-custody pipeline without 9 platform logins, document the architecture properly. Make it look like a tool a forensics unit would actually deploy.

## Success criteria (observable)
- Zero hardcoded credentials in any source file (search for `mongodb+srv`, `aayushman2702`, `<DB_PASS>`, OAuth client IDs in `App.jsx`, `mobileScraper` hardcoded credentials).
- Backend tests + frontend Jest tests run in CI (GitHub Actions). Currently 5 frontend tests + 0 others; expand to ~25.
- Replay-mode demo deployed to Vercel/Netlify — recruiter clicks "Run demo case" → sees full pipeline → downloads real PDF/JSON, no logins.
- `vercel.json` paths fixed (currently references nonexistent capitalized files).
- `docker/Dockerfile.frontend` works (currently empty — 0 bytes).
- `docker-compose.yml` boots backend + frontend + mongo for one-command local demo.
- README has Mermaid system diagram showing chain-of-custody (hash → signed log → S3).
- `docs/adr/` explains session-management, rate-limit strategy, cross-identity correlation algorithm.
- Mobile APK attached to GitHub release.
- `codex` review pass committed.

## Repo recon (frozen 2026-06-08)

### What this is
SIH '24 winner — multi-platform OSINT scraper for investigators. Ingests a target handle across 9 social platforms (Instagram, X, WhatsApp, Telegram, Facebook, Discord, Mastodon, YouTube, Drive) plus Maigret's 2,500-site sweep, emits PDF + JSON + chain-of-custody bundles. Public repo is the hackathon codebase; production fork runs at India's NIA.

### Stack
- **Backend** (`backend/`): Node 22 + Express 4, Mongoose/MongoDB, bcryptjs, JWT. Anaemic — single `server.js`, one route file, one controller.
- **Frontend** (`frontend/`): React 18 + Vite 5, Tailwind, Radix UI, Redux Toolkit, Firebase, Recharts/Chart.js, Framer Motion, Jest + Testing Library + MSW. Hardcoded Google OAuth `clientId` in `App.jsx:77`.
- **Scraper** (`scraper/`): TypeScript + Crawlee + Playwright + Puppeteer-extra-stealth + AWS SDK; plus Python (Telethon, Flask/Maigret, Langchain+Gemini, reportlab/PyPDF, xhtml2pdf). Dockerfile uses `apify/actor-node-playwright-chrome:18`.
- **mobileApp** (`mobileApp/`): Flutter 3.3+ client. Full android/ios/macos/windows/web scaffolds.
- **mobileScraper** (`mobileScraper/`): Appium + WebdriverIO TS — drives real Android Instagram app via emulator-5554.
- **docker/**: only `Dockerfile.frontend` (**empty — 0 bytes**).
- **Windows incompat:** scraper Dockerfile = Linux-only; mobileScraper needs Appium + Android emulator; Telethon `.session` SQLite WAL touchy on Windows.

### Current state
- **Backend** — works but anaemic: only `/api/users/signup`, `/login`, `/`, `/userInfo`. No scraper endpoints.
- **Frontend** — most surface area, 5 Jest tests, hardcoded Google OAuth client.
- **Scraper** — 9 platform routes in `scraper/src/routes/`. `instagram.ts:33-50` has `scrapeInstagramProfiles` call **commented out** — endpoint is no-op past the retry wrapper. `vercel.json` references `src/Instagram.ts`/`X.ts`/`Facebook.ts` (capitalised) that don't exist (routes are lowercase).
- **mobileApp** — Flutter scaffold (splash/onboarding/auth screens). Untested if it talks to backend.
- **mobileScraper** — `src/index.ts` hardcodes username/password (`<test_ig_user>` / `<TEST_PASS>`).
- **Docs** — README excellent. SESSIONS.md solid. Flowchart PNG present.
- **Committed scrape artifacts** — `output/Telegram/`, `output/Arsh Goyal _ Youtube/`, etc. contain real media.

### Maturity score
- Code quality: 4/10 (commented core, dead routes, inconsistent caps, hardcoded creds)
- Tests: 2/10
- Docs: 9/10 (README portfolio-grade)
- Deploy-readiness: 3/10 (Dockerfile empty, vercel.json broken)
- Demo-readiness: 2/10 (no live URL, no recorded video, no seed data, can't be exercised without 9 platform logins)

### Risks
- **`google.json` exists** — DO NOT READ.
- **Hardcoded `mongodb+srv://<DB_USER>:<DB_PASS>@cluster0.eivmu.mongodb.net/...` in ~13 scraper route files**. Investigate before any public push.
- **`output/` has real scraped media** committed despite `.gitignore /output/`. Possible privacy/copyright exposure.
- `mobileScraper/src/index.ts` hardcoded `<test_ig_user>` / `<TEST_PASS>` — verify throwaway before committing.
- Mobile build on Windows: Flutter fine; Appium for mobileScraper needs Android SDK + emulator. **DO NOT attempt to run mobileScraper.**
- Scraper code has commented-out core (`instagram.ts:49`) — `npm run start:instagram` won't actually scrape.
- `vercel.json` references nonexistent files — deploys fail.
- Frontend hardcodes Google OAuth `clientId` in `App.jsx:77`.
- `requirements.txt` is 312 lines of mixed transitive deps (Django, Wagtail, Poetry, semgrep, fyers_apiv3 — none used). Likely a `pip freeze` of the whole machine.

## Plan

### Phase A — Secret hygiene (S, highest priority)
1. Grep all source for `mongodb+srv`, `aayushman2702`, `<DB_PASS>`, `<test_ig_user>`, `<TEST_PASS>`, the Google OAuth client ID. List every hit in `DECISIONS.md`.
2. Replace every hit with `process.env.MONGODB_URI` etc. Add to `.env.example`.
3. `git filter-repo` cannot run from this session safely — instead, document in `DECISIONS.md` that the user must do a history scrub OR rotate credentials AND accept that history has them. Recommend rotation + a fresh push with squash.
4. Audit `output/` — list committed media files. Document privacy risk. Replace with synthetic fixtures (3-5 fake profiles, scraped from public test data or generated).
5. **Codex review.**

### Phase B — Fix the broken paths (M)
1. Uncomment / fix `scrapeInstagramProfiles` in `scraper/src/routes/instagram.ts:49` OR document why it's stubbed in code comments.
2. Fix `scraper/vercel.json` path casing.
3. Flesh out `docker/Dockerfile.frontend` (currently 0 bytes).
4. Write `docker-compose.yml` wiring backend + frontend + mongo for one-command local demo.
5. Clean `requirements.txt` — keep only what the Python scraper code imports. Pin versions.
6. **Codex review.**

### Phase C — Test + CI (M)
1. Expand frontend Jest tests (target 15 covering: auth flow, OSINT search trigger, results rendering, error states).
2. Backend tests with supertest (signup, login, JWT verify, userInfo).
3. Scraper TS typecheck + lint in CI.
4. Python scraper: pytest happy-paths for the PDF generator (offline-only).
5. GitHub Actions matrix: frontend Jest + Python lint + TS typecheck.
6. **Codex review.**

### Phase D — Replay-mode demo (L)
1. Implement `--replay` flag on the scraper that reads from `output/golden/` fixtures and produces real PDF/JSON output without hitting any platform.
2. Build a `/demo` route in the frontend that triggers replay-mode against a canned target handle.
3. Deploy frontend + backend to Vercel. Mongo Atlas free tier. Configure for replay-only public demo.
4. README adds: live demo URL, hero GIF of replay-mode running, downloadable sample PDF.
5. **Codex review.**

### Phase E — Architecture + docs (S/M)
1. Mermaid system diagram in README — chain-of-custody flow (hash → signed log → S3).
2. `docs/adr/` ADRs for: session management strategy, rate-limit / proxy strategy, cross-identity correlation algorithm.
3. Architecture diagram referenced from existing flowchart PNG.
4. README "NIA case study" section — non-confidential lessons from the prod fork.
5. **Codex review.**

### Phase F — Mobile + final polish (M)
1. Verify Flutter mobile app builds APK (you're on Windows — JDK 17, Android SDK installed).
2. Attach signed APK to a new GitHub release.
3. iOS: skip.
4. mobileScraper: leave as-is, document in README that it's prototype-only.
5. Final code cleanup pass (`requirements.txt` bloat, dead routes, unused mobile screens).
6. **Final codex review.**
7. Write `SESSION_SUMMARY.md`.

## End-of-session output (REQUIRED)
- **What changed** — area-level summary
- **Blocked on user** — rotate Mongo Atlas password, rotate Google OAuth secret, decide history-scrub vs accept, sign APK with real keystore, push to GitHub, point Vercel at the repo, redact any sensitive `output/` content
- **Deploy state** — frontend+backend `live at <vercel URL>` (demo mode); scraper `local-only` (no free path); mobile `APK attached to release`
- **Codex feedback log** — link to `codex/`

## Start
Read `STATE.md` if exists, otherwise create it and begin Phase A step 1. Go.
