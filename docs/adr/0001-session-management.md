# 0001 — Session management strategy

**Status:** Accepted

## Context

Tattletale logs into nine platforms as the investigator and walks a target's footprint. Re-authenticating on every run is a non-starter: most platforms gate login behind SMS/OTP, email confirmation, or device-approval prompts that demand a human. A scraper that re-auths each run would stall on the first 2FA challenge and could trip account-takeover defenses by logging in repeatedly from an automated context.

The code carries two distinct session shapes:

- **Telethon `.session` files** (`scraper/src/routes/telegram.py`) — a `TelegramClient(session_name, API_ID, API_HASH)` persists auth state in a SQLite database (`session_<phone>.session`) plus a `.session-journal` write-ahead log.
- **Playwright/Puppeteer persistent contexts** — `chromium.launchPersistentContext(...)` writes a full browser profile dir per platform: `./fb_context` (Facebook), `./x_context` (X), `./mastodon`, `./discord`, `./user-data` (WhatsApp), and Chrome `--user-data-dir` profiles for the Google-family scrapers (`timeline.ts`, `youtube.ts`, `google.ts`).

`.gitignore` treats all of these as live secrets: `*.session`, `*.session-journal`, `session_*.session*`, `session.json`, `/user-data`, `/discord`, `/mastodon`, `/scraper/fb_context`. `SESSIONS.md` documents the generation flow and the leak-response checklist.

## Decision

**Persist and reuse sessions; never re-auth automatically.** A session is generated once via a headed login flow (or the Telethon login script), then committed to local disk only and reused across runs. The persistent-context directory *is* the session — cookies, localStorage, and device fingerprint travel together, which keeps the browser profile coherent with the platform's expectations.

Sessions are owner-managed artifacts, not code. They are excluded from version control wholesale, and the repo ships only `*.example` placeholders.

## Consequences

- **Fragility on Windows:** Telethon's `.session` is SQLite in WAL mode. The `.session-journal` can be left locked or half-flushed if a run is killed, or if two processes touch the same session — a known Windows pain point. Treat a wedged session as disposable: delete it and regenerate rather than repair.
- **Per-platform coupling:** context dir paths are hardcoded per scraper, so concurrent runs against the same platform would collide on one profile dir. Parallelism is per-platform, not per-target.
- **Security blast radius:** anyone holding a `.session` or cookie jar is logged in as the investigator. Hence the aggressive `.gitignore` and the `SESSIONS.md` rotate-everything checklist.
- **Manual bootstrap cost:** first-run login is a human step per platform. Accepted as the price of stable, low-suspicion sessions.
