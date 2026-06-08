# STATE — Tattletale autonomous hardening

_Last updated: 2026-06-08 (session be165de2)_

## Environment reality (affects what is achievable)
- `codex` ✅ · `node`/`npm`/`npx` ✅ · `flutter` ✅ · `git` ✅
- `java` ❌ · `vercel` ❌ · `docker` ❌  → APK build, live Vercel deploy, and local docker-compose boot are **blocked-on-user** (documented, code still authored).
- No push to GitHub from this session (per global rules: never push without explicit ask; never force-push main).

## Phase progress
| Phase | Title | Status |
|-------|-------|--------|
| A | Secret hygiene | IN PROGRESS |
| B | Fix broken paths | pending |
| C | Tests + CI | pending |
| D | Replay-mode demo (code only; deploy blocked) | pending |
| E | Architecture + docs | pending |
| F | Mobile + final polish (APK blocked) | pending |

## Notes
- 19 source files carried the live Atlas URI; OAuth client hardcoded in `App.jsx:77`; mobileScraper creds in `index.ts`.
- Tracked sensitive files to untrack: `.env`, `google.json`, `session.json`, `scraper/session.json`.
- History still contains secrets → user must rotate Atlas password + OAuth secret. See DECISIONS.md.
