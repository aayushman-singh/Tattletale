# 0003 — Cross-identity correlation algorithm

**Status:** Accepted — scorer implemented in the replay engine (Phase 2); live-pipeline wiring + perceptual image hashing still designed.

## Update (Phase 2): the scorer is now code

The "step 3 (scoring) is designed, not coded" gap below is **closed for the
analysis path**. `scraper/src/replay/correlation.ts` implements a deterministic,
explainable correlation engine and the report now carries a computed
`correlation` block instead of hand-written `crossPlatformMatches`:

- **Signals scored per account pair:** Jaro-Winkler handle similarity, display-name
  similarity, bio token Jaccard, a **stylometric fingerprint** (punctuation,
  casing, lowercase-start habit, non-ASCII/language tell, function-word rates),
  **posting hour-of-day** cosine, and **shared distinctive vocabulary**.
- **Weighting reflects forensics:** a shared display name is deliberately *low*
  weight (namesakes are common); behaviour (style, timing, vocabulary) carries
  the decision. This is what lets the engine **flag a same-named account as a
  likely different person** instead of falsely merging it.
- **Clustering:** union-find over above-threshold edges yields identity clusters;
  every edge keeps its per-feature contribution breakdown so the UI/PDF can show
  *why* two handles were (or were not) linked. Output includes a deterministic
  graph layout, and the correlation artifact is itself folded into the
  chain-of-custody hash + Ed25519 seal.

Still designed, not coded: **perceptual profile-image hashing**, **link/email/phone
co-occurrence**, and wiring the scorer into the *live* Mongo-backed pipeline
(today it runs over the replay fixtures). The original design below stands as the
target for the live path.

## Update (Phase 3): a seventh signal — temporal-geospatial co-presence

`correlation.ts` now scores a seventh signal: **co-presence**. When posts carry
capture-location metadata (`GoldenPost.geo = {lat, lon}`), two accounts run by one
operator tend to post **from the same place at the same moment** — one device
cross-posting. The signal counts *distinct posting occasions* on account A that
are co-located with a post on account B within **250 m and 30 minutes**,
saturating at three occasions.

**Design choices, and why:**

- **Overlay, not a 7th convex weight.** Co-presence claims a fixed weight (0.1)
  *only when applicable*. When at least one account has no geo metadata the signal
  is **inapplicable** and the six behavioural weights renormalize to 1.0 — the
  score is then byte-identical to the six-signal engine. Absent metadata is true
  neutrality, **never an imputed value**. This is the all-or-nothing rule: no
  fabricated geo, no silent default.
- **Three distinct states, not two.** (1) *No instrument* — geo missing →
  inapplicable, renormalized out. (2) *Measured non-co-presence* — both geo-tagged
  but never within 250 m + 30 min → value 0, **kept in the average** as honest mild
  evidence *against* a shared operator. (3) *Co-presence* — value rises with
  repeated co-located occasions. Conflating (1) and (2) would be a lie about what
  the data shows.
- **Fine, not coarse — the namesake guard.** The 250 m / 30 min window is
  deliberately tight. Two strangers who merely live in the same city are routinely
  kilometres apart and never synchronized, so a shared *city* yields **zero**
  co-presence. Geo can therefore never collapse two distinct people on location
  alone; the complete-linkage merge guard and the modest 0.1 weight further bound
  its influence.

**What co-presence can prove:** that two accounts repeatedly emitted posts from the
same fine location within minutes — a strong tell for one operator/device when it
recurs.

**What it cannot prove:** it is still a *heuristic contribution to `cohesion`, not a
probability*. A single coincidence can be chance (a shared venue); spoofed or
absent geo is not evidence; and co-presence says nothing about *who* the operator
is. It raises or lowers a link score; it never decides identity on its own.

---

**Original status:** Proposed

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
