# Session Summary V4 — Tattletale

Autonomous wave executed per `HANDOFF_V4.md`. Two outcomes: **landed PR #13**
(Phase 0) and **added a 7th correlation signal — temporal-geospatial co-presence**
(mission), hardened against a brutal Codex review.

## Phase 0 — verified + landed PR #13 (merged to `main`, commit `50084bd`)

PR #13 recovered the intel-brief anti-hallucination guard rewrite (closed-class
`FUNCTION_WORDS` vocabulary-bounds check). CI was red on three checks; root-caused
each:

- **scraper tests (the real PR regression):** the new guard is *strictly stricter*
  than the old `STRUCTURAL_WORDS` check — ungrounded verbs ("appears", "frequently",
  "operates") are now rejected, not just capitalized tokens. Three brief tests
  asserted the old vocabulary. Per the handoff, I updated the **tests** to the
  principled behavior (did not weaken the guard): rebuilt each sentence so the
  hallucinated entity is the sole ungrounded token, and made the error-message
  regexes case-insensitive (the validator lowercases tokens).
- **python lint (pre-existing, fixed in-scope):** `scraper/src/routes/telegram.py`
  held bare `API_ID=YOUR_API_ID_HERE` placeholders — an `F821` undefined name that
  crashes the module at import. Replaced with `os.environ["TELEGRAM_API_ID"]` /
  `["TELEGRAM_API_HASH"]` (fail-loud, no fallback), `.env.example` updated to match.
- **secret-scan (left red — user-only):** `backend/.env` + `scraper/.env` are
  **tracked** (committed before the `*.env` ignore rule). Per hard rule #2 this is a
  leaked-credential git-history rotation = user-only task; not touched. `main` was
  already red on it, so #13 cannot satisfy it. Merged accepting this pre-existing red.

## Mission — 7th signal: temporal-geospatial co-presence (branch `feat/copresence-signal`)

**Idea:** two accounts run by one operator tend to post from the **same fine place
at the same moment** (one device cross-posting). The signal counts *distinct
posting occasions* on account A co-located with a post on B within **250 m and
30 min**, saturating at three.

**Design — applicability-gated overlay, not a 7th convex weight:**
- geo **missing/sparse** (< 2 capture-grade geo posts either side) → **inapplicable**;
  the six behavioural weights renormalize to 1.0 → score is byte-identical to the
  prior engine. Absence is true neutrality, never an imputed value (all-or-nothing).
- geo **present, no fine coincidence** → value 0, kept in the average → honest mild
  evidence *against* a shared operator (distinct from "no instrument").
- geo **present, co-located** → positive contribution (weight 0.1).
- `cohesion` stays a heuristic, not a probability.

**Forensic guards (the namesake guarantee):**
- **Merges are behavioural-only.** A `baseMatrix` of the six behavioural signals
  drives all merge decisions (candidate threshold *and* complete-linkage). Co-presence
  raises the displayed score / cohesion and can flag a link, but can **never**
  collapse two behaviourally-distinct people. A merely-shared **city** yields 0
  (250 m window); and a coarse `accuracyM` point (city/venue centroid) can't
  co-locate even at distance 0.
- **One-to-one greedy matching** of co-present pairs: symmetric in (a, b) and immune
  to a burst of duplicate posts inflating the signal.
- **Strict ISO-8601-with-timezone** parsing for geo posts; malformed geo/accuracy
  fails loudly.

**Wiring + demo:** `/demo` graph renders the seventh signal automatically (friendly
feature names + a rationale tooltip). The `ana_rivera_dev` fixture geo-tags only the
true-operator accounts (instagram + x) with two co-located cross-posts → a visible
`co-presence 0.667 (2 occasions)` edge; mastodon is left geo-less (its edges stay
neutral) and the facebook cooking **namesake keeps no geo and stays a separate
identity** — the guard holds in the demo, not just in tests. Bundle regenerated.

**Codex review — two brutal passes (saved `codex/20260611-copresence-signal.md`):**
- *Pass 1* caught an order-dependent/spam-gameable occasion count, a merge guard that
  was "just the weight magnitude" (a 0.1 overlay could push a pair over merge), and a
  coarse-centroid hole. Fixes: behavioural-only merges, one-to-one symmetric matching,
  `accuracyM` gate, coverage gate, strict ISO timestamps, weights summing to 1.0.
- *Pass 2* confirmed those guarantees hold and found three more: coarse points still
  counted toward coverage (coarse-only accounts scored a zero instead of being
  inapplicable); duplicate-burst immunity was one-sided (both-sided bursts still
  saturated); and determinism holes (`hourHistogram` parsed timestamps loosely;
  canonical sort used locale-dependent `localeCompare`, with stray NUL separators).
  Fixes: drop coarse points in `geoStamps`; count distinct temporal occasions
  (gap-cluster matched times); strict parse everywhere; code-point canonical sort.
- One finding rejected with reason: `geo: null` is a legitimate "no location recorded"
  state (neutral); a present-but-malformed geo object already throws.

## Verification
- `scraper` test suite: **59 pass / 0 fail** (correlation suite 10 → 24).
- Brief suite green; co-presence raises score & cohesion for a true co-present pair;
  coarse city / coarse-accuracy / behaviourally-weak pairs do **not** merge;
  one-sided & sparse geo are byte-identical to geo-less; permutation-symmetric;
  malformed geo and timezone-less timestamps fail loudly.
- `frontend`: 38 tests pass; production build clean.
- `replay/` typechecks clean (pre-existing `src/Helpers/*` tsc errors belong to the
  non-blocking typecheck job, untouched).
- Reported correlation weights sum to **1.000**.

## Decisions (full log in `DECISIONS_V4.md`)
- D1 update stale brief tests, not the guard. D2 fix telegram F821 in-scope.
  D3 leave secret-scan red (user-only rotation). D4 co-presence as applicability-gated
  overlay with behavioural-only merges (geo never decides identity).

## State / follow-ups
- `STATE_V4.md` holds resumable state. The co-presence branch is ready for PR.
- Out of scope (user-only): rotate + untrack `backend/.env` / `scraper/.env` to clear
  the gitleaks `secret-scan` check. Live-pipeline wiring of the scorer (it runs over
  replay fixtures) and provenance/trust for real geo metadata remain future work.
