# 0003 — Cross-identity correlation algorithm

**Status:** Proposed

## Context

A target rarely uses one identity. The same person is `@jdoe` on Instagram, `j.doe` on X, a phone number on Telegram, and an email on Google. The investigator's question is "are these the same person?" — and a court-ready answer needs *signals*, not a guess. This is the "same person, different handles, stitched together" claim in the README, and it is the highest-value and thinnest part of the codebase.

What exists today:

- **Username seed (implemented).** `frontend/maigret/server.py` runs Maigret against a handle across many sites (hackathon config: `--top-sites 20`; full capability: 2,500+ sites) and returns the URLs where that exact username exists. This is the breadth sweep that proposes candidate identities.
- **Per-platform confirmation (implemented).** Each platform scraper then pulls the profile behind a candidate handle — display name, bio, profile image URL, follower/following lists, external/bio links — and upserts it into `${platform}DB.${platform}_users` (`mongoUtils.ts`: `insertInstagramProfile`, `uploadMastodon`, `insertFollowers`, `insertObject`, etc.).
- **Timeline aggregation (partial).** `timeline.ts` and the `TimelineUser` model (`timelineDB.timeline_users`, fields `timeline` plus `timeline_1..10`) collect up to ten per-platform timeline slices keyed by `username`, giving a single temporal spine across platforms.

What does **not** exist as code yet: an actual scoring/correlation function. There is no module that compares display names, hashes profile images for perceptual matching, or weights co-occurring links to emit a confidence score. Correlation today is *manual* — the investigator reads the assembled per-platform documents and the unified timeline and judges identity overlap themselves.

## Decision

**Adopt a seed-then-confirm-then-score model. Treat Maigret as the seed and per-platform confirmation as the evidence layer (both built); specify scoring as the designed next step.** The intended algorithm:

1. **Seed** — Maigret username sweep proposes candidate accounts sharing the handle.
2. **Confirm** — scrape each candidate's profile into its platform DB.
3. **Score** — compute a per-pair identity confidence from correlation signals:
   - exact/fuzzy **display-name** match,
   - **bio** token overlap,
   - **profile-image** similarity (perceptual hash),
   - **co-occurring links** (same external URL, email, or phone across profiles),
   - **timeline co-occurrence** (activity bursts aligning across platforms in the `timelineDB` spine).
4. **Surface** — emit matched identities into the report bundle with their supporting signals, so the chain of custody shows *why* two handles were linked.

## Consequences

- **Honest status:** steps 1–2 ship; step 3 (scoring) is designed, not coded. The report links what the investigator confirms, not what an algorithm asserts — which is defensible for court but does not scale to high-volume triage.
- **Data is already shaped for scoring.** Profiles, bio links, follower lists, and a 10-slot timeline are persisted in Mongo; a scorer can read these without new scraping.
- **Profile-image hashing is the missing primitive.** No content-hash pipeline exists yet (see the chain-of-custody note in the README), so perceptual image matching would be the first piece to build — and it doubles as the evidentiary SHA-hash layer.
- **No silent auto-merge.** Correlation must stay explainable; any future scorer surfaces evidence and confidence rather than collapsing identities behind the investigator's back.
