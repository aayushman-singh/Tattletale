# 0002 — Rate-limit, anti-bot, and proxy strategy

**Status:** Accepted

## Context

Every target platform actively defends against automation: bot-detection fingerprinting, soft rate limits that degrade to CAPTCHAs, and hard limits that lock the account. Tattletale runs unattended ("walk away, come back to a report"), so it must stay below each platform's suspicion threshold without a human watching for a challenge prompt.

What the code actually does today:

- **Browser stealth.** Browser-driven scrapers use `puppeteer-extra` with `puppeteer-extra-plugin-stealth` (`FacebookScraper.ts`, `FacebookProfile.ts`, `X/Xtimeline.ts`) to mask the headless-automation tells (`navigator.webdriver`, plugin/codec gaps, etc.). Playwright scrapers run through `launchPersistentContext` so a real, warmed browser profile carries consistent fingerprints across runs.
- **Retry with backoff.** Route handlers wrap each scrape phase in `async-retry` with `retries: 3` and an `onRetry` logging hook (clearly visible in `instagram.ts`; the same pattern repeats across `discord.ts`, `youtube.ts`, `whatsapp.ts`, `google.ts`). Transient failures (a slow selector, a flaky network hop) get up to three attempts before the phase fails loudly.
- **Crawlee.** The scraper stack is built on Crawlee, which brings autoscaling and request-queue management (`scraper/src/Helpers/storage/request_queues/`); concurrency is bounded by the framework rather than firing requests unthrottled.
- **Per-platform politeness.** Because each platform has its own scraper module and its own persistent context, pacing is tuned per platform rather than globally — a slow human-like cadence on Instagram, a different one on X.
- **Maigret.** The OSINT sweep (`frontend/maigret/server.py`) is rate-limited at the tool level via `--timeout` and `--retries` flags; the hackathon config runs a reduced `--top-sites 20` sweep for speed, with Maigret's full 2,500-site capability available by dropping that cap.

## Decision

**Lean on stealth + bounded retries + per-platform pacing now; design proxies as the next layer, not a hard dependency.** Stay polite enough that a single warmed session per platform survives repeated runs. Treat the 3-retry `async-retry` wrapper as the standard failure envelope for every scrape phase.

## Consequences

- **No proxy layer is implemented.** All traffic egresses from the host IP. This is honest about the hackathon version: it works for demo-scale and single-target investigations but does not rotate IPs. The natural insertion point is the browser launch (`launchPersistentContext` / puppeteer launch args accept a `--proxy-server`) and Maigret's proxy flags — a residential/rotating proxy pool would slot in there without touching scrape logic.
- **Retries can amplify suspicion.** Three back-to-back attempts against a platform already rate-limiting you can deepen the limit. Backoff is logged, not exponentially aggressive — tune per platform if a target hardens.
- **Stealth is best-effort.** `puppeteer-extra-plugin-stealth` is an arms race; platform detectors evolve. No fallback masks a hard block — a blocked scrape fails loudly so the investigator knows the data is incomplete rather than silently truncated.
- **Throughput is capped by politeness, not hardware.** Accepted: court-grade completeness beats speed.
