# Golden Fixtures — 100% Synthetic Demo Data

Everything in this directory is **fabricated**. These are the fixtures that power
Tattletale's **replay mode**: a keyless, network-free demo of the full
scrape → normalize → hash → chain-of-custody → report pipeline.

## What this is NOT

- These are **not** real people. `ana_rivera_dev`, `marcus_chen_ops`, and
  `priya_n_research` are invented personas.
- **No account was ever scraped** to produce this data. There were no logins, no
  network calls, and no MongoDB involved.
- Every follower count, post, bio, and cross-platform match was hand-written to be
  *plausible but obviously synthetic* for a demo.

## Why it exists

The live scraper needs ~9 platform logins and a headed browser, so it can't be
demoed publicly. Replay mode reads these fixtures instead and produces **real**
artifacts (a JSON report, a SHA-256 chain-of-custody manifest, an append-only
custody log, and a PDF) so a reviewer can experience and download the genuine
pipeline output without any credentials.

## Structure

```
output/golden/
  <handle>/
    case.json              # synthetic aggregated multi-platform findings (the "scrape")
    generated/             # real artifacts produced by the replay CLI from case.json
      report.json
      manifest.json
      custody-log.json
      report.pdf
  README.md                # this file
```

Regenerate the `generated/` bundle for a handle with:

```
cd scraper
npm run start:replay -- <handle>
```
