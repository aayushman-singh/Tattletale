# SESSION SUMMARY — Tattletale hardening (2026-06-08)

Autonomous portfolio-hardening pass. All work is on branch
**`hardening/autonomous-session`** (8 commits, nothing pushed). Working tree is
clean. Three independent codex reviews were run and their findings addressed
(see `codex/`, scrubbed to findings-only).

---

## What changed (by area)

**Security / secret hygiene (Phase A)**
- Removed the live MongoDB Atlas URI from **19 source files**, the Google OAuth
  **client secret** (`GOCSPX-…`) + client id from `gdrive.ts`/`gmail.ts`, the
  frontend OAuth client from `App.jsx`, and Instagram creds from `mobileScraper`.
  Everything now reads from env and **fails loudly** when unset (no fallbacks).
- Split Mongo config into `MONGO_URI` (backend app DB) and `MONGO_CLUSTER_URI`
  (scraper cluster) via a `clusterUri()` helper + mongoose `{ dbName }` — no
  more URI string-surgery.
- Untracked `.env`, `backend/.env`, `google.json`, `session.json`,
  `scraper/session.json`, scrape caches, and **562 real scraped-media files**
  (~50 MB) under `output/` (privacy/copyright). Verified the working tree is
  100% free of live-secret literals; added a **gitleaks** CI gate.

**Broken paths (Phase B)**
- `scraper/vercel.json`: pointed at real route files (were nonexistent
  capitalised paths). `docker/Dockerfile.frontend` (was 0 bytes) → real
  multi-stage nginx build; added `Dockerfile.backend`; added `docker-compose.yml`
  (backend + frontend + mongo, one command). `requirements.txt`: 311-line
  pip-freeze → 14 actually-imported pinned deps. Documented the intentionally
  stubbed Instagram bulk-scrape path. Fixed broken scraper npm scripts.

**Tests + CI (Phase C)**
- Backend: 10 supertest cases on `mongodb-memory-server` (no network). Frontend:
  made the suite runnable and expanded to **38** passing tests. Scraper: **14**
  `node:test` cases (config helper + replay chain-of-custody). GitHub Actions:
  honest CI (no `|| true`), gitleaks secret-scan, scoped python lint + compile.

**Replay-mode demo (Phase D)** — the centrepiece
- `scraper/src/replay/`: offline CLI that reads **synthetic** golden fixtures
  (`output/golden/`, 3 invented personas) and emits `report.json` + `report.pdf`
  + a **real SHA-256 hash-chain custody log** + manifest with a recomputable
  **root hash** — no Mongo, no network, no creds. This makes the README's
  chain-of-custody claim demonstrably true (tamper-evident; honestly documented
  as not-yet-signed/court-grade).
- Frontend **`/demo`** route (no auth) that runs the pipeline visually and serves
  the pre-generated bundle statically (`frontend/public/demo/`, ships in `dist/`)
  — works on a **keyless** deploy. `App.jsx` runs in explicit demo mode when no
  OAuth client is configured.

**Architecture + docs (Phase E)**
- README: chain-of-custody **Mermaid** diagram + Architecture section + a "Try
  it" replay section. `docs/adr/`: session management, rate-limit/proxy,
  cross-identity correlation (honest about implemented vs designed).

**Hardening from codex review (security pass)**
- JWT secret was hardcoded `"1234"` → moved to `JWT_SECRET` env (fail loud).
  Signup now validates required fields (400, was 500). Backend `/health` endpoint
  (docker healthcheck no longer hits a protected route). Python report shims that
  were import-time `NameError`s now parse and compile.

---

## Blocked on user (REQUIRED before any public push)

1. **Rotate credentials — treat as compromised** (they remain in git *history*):
   - MongoDB Atlas password for `aayushman2702`.
   - Google OAuth **client secret** (`GOCSPX-…`) + restrict the client id; rotate
     the `google.json` service-account key.
2. **Scrub git history** (`git filter-repo` + squash → fresh repo) OR accept
   history exposure *after* rotation. Recommended: rotate + squash-push to a new
   repo so the portfolio repo has clean history. (Includes the 562 media files.)
3. **Deploy** frontend (+ optional backend) to Vercel; point it at the repo; set
   `MONGO_URI` (Atlas free) and optionally `VITE_GOOGLE_OAUTH_CLIENT_ID`. The
   `/demo` route needs no backend.
4. **Mobile APK**: build + sign with a real keystore — could not be done here
   (`java` absent; Flutter toolchain non-functional in this shell). `flutter build
   apk` on a JDK-17 machine, then attach to a GitHub release.
5. **Redact/remove session scratchpads** before making the repo public:
   `HANDOFF.md`, `STATE.md`, `DECISIONS.md` expose internal workflow + the
   incident trail (keep them in a private branch/location). The "NIA production
   fork" framing in the README is your deliberate choice — confirm you want it public.
6. Review and `git push` the `hardening/autonomous-session` branch (not pushed by
   this session; never force-push main).

## Deploy state
- **Frontend + backend**: deploy-ready (build verified green; docker-compose +
  Dockerfiles authored) — **not yet live** (no `vercel`/`docker` in this env).
- **Replay demo**: fully working locally; static bundle ships in `dist/demo/`.
- **Scraper**: **local-only** (needs headed Chromium + platform sessions — no free path).
- **Mobile**: APK **not built** (blocked on JDK/toolchain) — attach to a release after building.

## Codex feedback log
`codex/` — three reviews (Phase A, final branch, pass-2), each scrubbed to
findings-only. Dispositions tracked in `DECISIONS.md` (D5, D6). Net: every code
finding resolved or shown a false positive; the only residual NO-GO driver is the
git-history secret rotation, which is action #1 above.
