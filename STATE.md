# STATE — Tattletale autonomous hardening

_Last updated: 2026-06-08 (session be165de2) — COMPLETE_

## Environment reality
- `codex` ✅ · `node`/`npm`/`tsx` ✅ · `flutter` present but toolchain non-functional in this shell · `git` ✅
- `java` ❌ · `vercel` ❌ · `docker` ❌ → APK build, live Vercel deploy, and local docker-compose boot are **blocked-on-user** (code authored + verified by other means).

## Phase progress
| Phase | Title | Status |
|-------|-------|--------|
| A | Secret hygiene | ✅ done (tree clean; history rotation = user action) |
| B | Fix broken paths | ✅ done (vercel paths, Dockerfiles, compose, requirements, instagram doc) |
| C | Tests + CI | ✅ done (backend 10, frontend 38, scraper 14; CI w/ gitleaks) |
| D | Replay-mode demo | ✅ code done + verified (deploy = user action) |
| E | Architecture + docs | ✅ done (README mermaid + 3 ADRs) |
| F | Mobile + final polish | ✅ done except APK build (blocked: no java/working toolchain) |

## Branch
`hardening/autonomous-session` — 8 commits off `main`. Working tree clean (only
gitignored local scrape media remains untracked).

## Codex passes (all in `codex/`, scrubbed to findings-only)
1. Phase A review → 8 findings, all addressed.
2. Final branch review → NO-GO, 16 findings; all code findings fixed, 2 false positives noted.
3. Pass-2 review → prior criticals resolved; residual = git-history secret rotation (user action).

## Test/build evidence
- `backend && npm test` → 10 passed
- `frontend && npm test` → 38 passed; `npm run build` → clean, ships `dist/demo/*`
- `scraper && npm test` → 14 passed
- replay CLI root hash: `6227699c3486d7b0a728e853dc8a53dc1eb4c07208faee758945accb0b0c05d6`

## Outstanding = user actions (see SESSION_SUMMARY.md "Blocked on user")
Rotate Atlas password + Google OAuth client secret + service-account key; scrub git
history; deploy frontend to Vercel; build/sign APK; remove session scratchpads
(HANDOFF/STATE/DECISIONS) before public push.
