# STATE_V4 — Tattletale orchestration

Read this first on resume. Append-only-ish; keep current.

## Phase 0 — land PR #13 (IN PROGRESS)
- PR #13 `fix/brief-vocabulary-bounds-guard` → main. Recovers FUNCTION_WORDS closed-class anti-hallucination guard in `scraper/src/replay/brief.ts`.
- Root cause of red CI: new guard is strictly stricter than old STRUCTURAL_WORDS — 3 brief tests asserted old vocabulary (ungrounded verbs "appears"/"frequently"/"operates" now rejected). FIXED by rebuilding test sentences so the hallucinated entity is the sole ungrounded token; guard NOT weakened. (commit 1)
- Also fixed pre-existing `python` lint red: `scraper/src/routes/telegram.py` had bare `API_ID=YOUR_API_ID_HERE` (F821, runtime NameError). Now reads `TELEGRAM_API_ID`/`TELEGRAM_API_HASH` from env, fail-loud, matching MONGO_CLUSTER_URI pattern. `.env.example` updated. (commit 2)
- Local: all 46 scraper tests pass; ruff E9/F63/F7/F82 green.
- Pushed 2564141. Awaiting CI.

### Known-red, OUT OF SCOPE (user-only, rule #2)
- `secret-scan (gitleaks working tree)` = 6 leaks. Cause: `backend/.env` + `scraper/.env` are TRACKED (committed before `.gitignore` `*.env` rule). This is leaked-credential git-history rotation = user-only task. Do NOT git-rm or rewrite history. Pre-existing red on main.
- `scraper-typecheck (non-blocking)` — non-blocking by design.

## Phase 0 — DONE
- #13 merged to main (commit 50084bd). Brief tests aligned to closed-class guard; telegram.py F821 fixed.

## Phase 1 — 7th signal: temporal-geospatial co-presence (IMPLEMENTED, on branch feat/copresence-signal)
- Design: applicability-gated OVERLAY (weight 0.10), NOT a 7th convex weight.
  - geo MISSING → inapplicable → six weights renormalize to 1.0 → byte-identical to prior engine (true neutral, no fabrication).
  - geo PRESENT, no fine coincidence → value 0, kept in avg (honest evidence-against).
  - geo PRESENT, co-located within 250 m + 30 min → counts distinct occasions on account A, saturates at 3.
- Files: types.ts (GeoPoint + GoldenPost.geo?), correlation.ts (haversine, geoStamps, coPresence, scorePair overlay, method+weights), correlation.test.ts (+7 tests).
- Demo: ana_rivera_dev fixture geo-tagged on instagram+x (2 co-located cross-posts → ig↔x coPresence value 0.667). mastodon geo-less (neutral), facebook cook namesake geo-less & stays separate. Bundle regenerated. IdentityGraph shows friendly feature names + rationale tooltip.
- Tests: scraper 53 pass; frontend 38 pass; frontend build clean; tsc replay clean (pre-existing Helpers/* tsc errors = non-blocking job, not mine).
- Commits: (1) feat(correlation) engine+tests, (2) feat(demo) fixture+graph+bundle, (3) docs ADR0003+README, (4) harden(correlation) per codex.
- Codex pass 1 (saved codex/20260611-copresence-signal.md): 3 Critical + several High/Med. Applied: behavioural-only merge guard (geo never merges), one-to-one symmetric matching (anti-spam, order-independent), accuracyM coarse-centroid gate, MIN_GEO_COVERAGE=2, strict ISO timestamp, weights sum=1.0. Rejected #9 (null geo = legit absent). Tests now 22 in correlation suite.
- Verified: scraper 53→ (now more) pass; weights sum 1.000; demo ig↔x coPresence 0.667; facebook namesake stays singleton; cohesion 0.739.
- Codex pass 2 done: confirmed (1)(2)(3); found 3 more (coarse coverage, both-sided burst, determinism). All fixed (commit 5). Suite 59 pass.
- DONE: docs (ADR0003+README), SESSION_SUMMARY_V4.md, both codex passes saved/applied, branch pushed.
- NEXT: open PR for feat/copresence-signal → main. (secret-scan will be red — user-only, documented.)

## Decisions log: DECISIONS_V4.md
