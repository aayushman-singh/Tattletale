# DECISIONS — Tattletale autonomous hardening

Decisions made without blocking on the user (per HANDOFF rule 1). Each entry: what, why, and any user follow-up required.

---

## D1 — Secret inventory (Phase A, step 1)

Live MongoDB Atlas URI `mongodb+srv://<DB_USER>:<DB_PASS>@cluster0.eivmu.mongodb.net/...` found hardcoded in **19 tracked source files**:

**scraper/src/routes/ (13):** discord.ts, facebook.ts, gdrive.ts, gmail.ts, google.ts, instagram.ts, log.ts, mastodon.ts, telegram.py, timeline.ts, whatsapp.ts, x.ts, youtube.ts

**frontend/pdf_conv/ (6):** discord.py, google_drive.py, mastodon.py, twitter.py, whatsapp.py, youtube.py

Other hardcoded secrets:
- `frontend/src/App.jsx:77` — Google OAuth `clientId` `218022995131-...apps.googleusercontent.com`
- `mobileScraper/src/index.ts:6-7` — Instagram creds `<test_ig_user>` / `<TEST_PASS>`
- `scraper/src/routes/log.ts:258` — password `<DB_PASS>` in `encodeURIComponent(...)` + leaked in a comment (line 255)
- `scraper/src/routes/gdrive.ts:17` & `gmail.ts:22` — Google OAuth **client secret** `GOCSPX-<REDACTED>...` (a live secret, higher severity than the client ID) → moved to `GOOGLE_OAUTH_CLIENT_SECRET`
- `mobileScraper/test.ts:36` — second hardcoded cred `<test_ig_user>` / `<TEST_PASS>` → `process.env.IG_USERNAME/IG_PASSWORD`
- Sample handle `<test_ig_user>` appears in `frontend/src/components/data/Instagram.csv` (sample data, not a credential — left as-is; it is a public-looking demo handle).

**Tracked files that should not be in the repo:** `.env`, `google.json`, `session.json`, `scraper/session.json` (all `git ls-files`-tracked despite `.gitignore`).

## D2 — Replacement strategy (final, after codex review — see D5)

- **TS routes:** `scraper/src/Helpers/mongoUri.ts` exports `clusterUri()` → reads `process.env.MONGO_CLUSTER_URI` and returns it **unmodified** (throws loudly if unset). Routes connect with `mongoose.connect(clusterUri(), { dbName: "<platform>DB", ... })` — the driver selects the database, no string surgery.
- **Python (pdf_conv + telegram.py):** literal replaced with `os.environ["MONGO_CLUSTER_URI"]` (KeyError = loud failure). DB still selected explicitly via `client[DATABASE_NAME]`, so behaviour is identical.
- **App.jsx:** OAuth client → `import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID`, with an explicit demo-mode path (see D5 #6).
- **mobileScraper:** creds → `process.env.IG_USERNAME` / `process.env.IG_PASSWORD`, throw if unset.
- **Two Mongo env vars on purpose:** backend keeps `MONGO_URI` (full app-DB URI); scraper uses `MONGO_CLUSTER_URI` (cluster, no db). This avoids the contract break codex flagged.

## D3 — Git history still contains the secrets — USER ACTION REQUIRED ⚠️

`git filter-repo` history rewrite is **not run from this session** (destructive, and a force-push to a shared remote is out of scope per global rules). The working tree is now clean, but **every leaked credential remains in git history**.

**The user MUST, before any public push:**
1. **Rotate the MongoDB Atlas cluster password** for user `aayushman2702` (the `<DB_PASS>` password is compromised — it is in history and may already be indexed).
2. **Rotate the Google OAuth client secret** `GOCSPX-<REDACTED>...` AND restrict the client (`218022995131-...`) in Google Cloud Console, and rotate the `google.json` service-account key. (The client *secret* is the urgent one.)
3. Decide between: (a) history scrub via `git filter-repo` + squash + fresh force-push to a *new* repo, or (b) accept history exposure *after* rotating all creds so the leaked values are dead. **Recommendation: rotate everything (cheap, instant) AND squash-push to a fresh repo** so the portfolio repo has clean history.

Until rotation is done, treat the cluster and OAuth client as compromised.

## D3b — `output/` real scraped media (Phase A, step 4)

`git ls-files output/` tracked **562 files / ~50 MB** of real scraped media from named third parties:
- `EduShine Classes - RRSIMT` (429 files), `Arsh Goyal _ Youtube` (81), `Loot Deals KS` (44), `Telegram` (8)
- 400 jpg, 111 pdf, 45 oga (Telegram voice notes), 4 mp4, 2 txt

This is a privacy + copyright exposure (real people's content, scraped). **Decision:** untracked the entire `output/` tree (`git rm -r --cached output/`; already gitignored, kept on local disk). The portfolio demo will instead ship **synthetic golden fixtures** under `output/golden/` (committed deliberately, see Phase D) using invented profiles. History still contains the media — rolled into the same history-scrub recommendation as the secrets (D3).

## D5 — Codex review of Phase A (`codex/20260608-195809-phaseA.md`)

Codex (gpt-5.5, xhigh) returned 8 findings. Disposition:
1. **Incomplete purge** (secrets still in `scripts/`, DECISIONS, HANDOFF) → ✅ deleted the spent one-shot migration scripts; redacted literals in DECISIONS.md + HANDOFF.md to placeholders. History rotation already covered in D3.
2. **`MONGO_URI` dual meaning** (backend full-URI vs scraper cluster-base) → ✅ split into `MONGO_URI` (backend) + `MONGO_CLUSTER_URI` (scraper/python). See D2.
3. **`mongoUri()` string surgery** → ✅ replaced with `clusterUri()` + mongoose `{ dbName }` option; no URI manipulation.
4. **dotenv not loaded in `mastodon.ts` / `log.ts`** → ✅ both now `import "../../../config.js"`.
5. **PDF report path split-migrated** (some pdf_conv files were broken `MONGO_URI=YOUR_..._HERE` shims) → ✅ all 9 pdf_conv + telegram now read `MONGO_CLUSTER_URI` consistently. (The 3 ex-shims still carry placeholder `DATABASE_NAME`/`COLLECTION_NAME` — pre-existing gutted state, not a secret; left as-is and noted.)
6. **Frontend OAuth silent fail** → ✅ `App.jsx` validates the client id and, when absent, runs in explicit **demo mode** (Google sign-in disabled, loud `console.warn`) — an intended alternative for the keyless replay demo, not a silent fallback.
7. **`REPLAY_MODE` advertised but unimplemented** → resolved by Phase D (replay-mode actually built).
8. **No tests for the config helper** → ✅ added `scraper/src/Helpers/__tests__/mongoUri.test.ts`.

## D4 — Deploy / build constraints (this environment)

- `vercel` CLI and `docker` are not installed, and `java` is absent → live Vercel deploy, local docker-compose boot, and APK signing **cannot be executed here**. All corresponding artifacts (vercel.json, Dockerfiles, docker-compose.yml, CI, replay-mode code, ADRs) are authored and committed so the user can run them in one step. These are documented as blocked-on-user in SESSION_SUMMARY.md.
