# REVIEW_SUMMARY — V4 co-presence signal + "Case File" restyle

Adversarial review of `origin/main` (commits `a6b62b6`→`a7b61f4`): the 7th correlation
signal (temporal-geospatial co-presence) and the dossier restyle. Method: an
independent `codex exec` adversarial pass over the signal diff + a manual review,
plus a CI-failure root-cause investigation. Git history was **not** rewritten.

## TL;DR

- **One real forensic defect found and fixed** in the co-presence signal: a missing
  `accuracyM` was silently treated as a *perfect* 0 m fix (`?? 0`) — a no-fabrication
  violation that let unqualified coordinates certify fine co-presence. Now an
  undeclared accuracy is a non-instrument (dropped → neutral), exactly like a coarse point.
- **One real restyle regression found and fixed**: the two-tone "tattle·tale" wordmark
  broke `header.test.jsx` (and frontend CI). Test now matches the visible brand text
  across the styling split.
- **Root-caused the red scraper CI**: the secret-history scrub collaterally dropped the
  git-tracked golden fixture `output/golden/ana_rivera_dev/case.json`. Recovered the
  genuine original from the pre-scrub commit and re-committed it.
- **All tests green**: scraper 60/60, frontend 38/38.

## 1. Co-presence signal — forensic guarantees

Verdict against the four required guarantees (codex + manual agree):

| Guarantee | Holds? | Evidence |
|---|---|---|
| (a) A coarse shared location can't merge two distinct people (namesake) | ✅ | Merges are decided **only** on `baseMatrix` — the pure six-signal behavioural score with **no** co-presence term — under a strict complete-linkage guard (`correlation.ts:594,611`). Name+handle+bio max out at 0.48 < 0.55 merge bar. Co-presence can raise a *displayed* edge but never collapse identities. Covered by `co-presence cannot manufacture a merge…`. |
| (b) Missing geo/time degrades to neutral, never fabricated | ⚠️→✅ | Absent `geo` was already neutral (renormalized out). **But** a present point with **no `accuracyM`** was fabricated as 0 m precision — fixed (see §2). |
| (c) `cohesion` stays a heuristic, not a probability | ✅ | `method` string and `IdentityCluster.cohesion` doc both state "NOT a calibrated probability"; singletons are `null`. PDF/brief wording says "cohesion", never "probability". |
| (d) Merges remain behavioural-only | ✅ | Same as (a): `baseMatrix` drives agglomeration; the co-presence overlay only touches the displayed `score`/`cohesion`. |

## 2. Fixed: precision fabrication on missing `accuracyM` (the one real signal defect)

**Defect.** `geoStamps()` gated capture-grade points with `(geo.accuracyM ?? 0) > RADIUS`.
A coordinate that declared *no* accuracy therefore defaulted to **0 m** — a perfect fix —
and could produce a "co-located posting" claim. Unknown precision was being treated as
certainty: a silent fallback and a fabricated value, against the project's no-fallback /
no-fabrication stance. (codex flagged this High; manual review concurred.)

**Fix.** `accuracyM` is now **required and fine** (`≤ 250 m`) for a point to count as a
co-presence instrument. An undeclared accuracy is a non-instrument and is dropped — the
signal renormalizes out to true neutrality, identical to how a coarse city centroid is
handled. No throw (accuracy is legitimately optional metadata; an unqualified point is
simply not evidence of fine co-presence).

- `scraper/src/replay/correlation.ts` — `geoStamps` gate + comment.
- `scraper/src/replay/types.ts` — `GeoPoint.accuracyM` contract clarified.
- `scraper/src/replay/__tests__/correlation.test.ts` — capture-grade test points now
  declare fine accuracy; **new regression test** `a point with no stated accuracy is not
  an instrument: inapplicable, not a perfect fix` locks the behaviour.
- `output/golden/ana_rivera_dev/case.json` — the demo's 8 capture-grade geo points now
  carry an explicit fine `accuracyM` (25 m), so the demo's co-presence rests on declared
  precision, not an assumption. **Co-presence output is unchanged** (still 0.667 / 2
  occasions; regenerated `correlation.json` is byte-identical, sha `d21fd4b4…`).

Forensic impact: the engine no longer manufactures precision it was never given. The
demo's co-presence claim is now backed by stated instrument accuracy.

## 3. Root cause of red scraper CI — scrub-dropped golden fixture

The `scraper` CI job was failing on every post-scrub commit with
`No golden fixture for handle "ana_rivera_dev"`. Investigation: the job was **green** on
the pre-scrub commits and went red exactly at the secret-history rewrite. The scrub
dropped `output/golden/ana_rivera_dev/case.json` from the tree even though `.gitignore`
explicitly whitelists it (`!/output/golden/**`) — it was meant to be tracked.

The full fixture (with full post sets) is not derivable from the committed sample bundle,
so it could not be re-authored from scratch without inventing data. Recovered the genuine
original blob from the orphaned pre-scrub commit via the GitHub contents API and
re-committed it. Confirmed it reproduces the committed demo co-presence exactly.

Also added a `.gitignore` rule excluding `output/golden/*/generated/` (CLI scratch:
ephemeral signing key + wall-clock `generatedAt`) — the served bundle lives in
`frontend/public/demo/`.

## 4. Restyle ("Case File" dossier theme)

- **Fixed regression**: the wordmark became `tattle<span>tale</span>` (two-tone), splitting
  the brand across text nodes so `getByText("tattletale")` failed — breaking
  `header.test.jsx` and frontend CI. The visible brand is still "tattletale"; the test now
  matches the brand `<span>`'s normalized text content, tolerant of the colour split.
- **Semantic colour-coding preserved**: link-band colours remain meaningfully distinct —
  high = green (`#45a06a`), medium = amber (`#d99a32`), low = muted (`#6b6253`) — just
  re-toned to the dossier palette (was `#22c55e / #f59e0b / #6b7280`). Edge legend and
  selected-edge band colouring still key off the band.
- Full frontend suite (7 suites / 38 tests) and production build pass — no broken
  routes/states surfaced.

## 5. Test results (post-fix)

| Suite | Result |
|---|---|
| scraper (`npm test`) | **60 / 60 pass** (was failing: missing fixture) |
| frontend (`jest`) | **38 / 38 pass** (was 1 fail: header) |
| frontend build (`vite`) | ✅ |
| scraper typecheck | no new errors in the reviewed files (legacy route errors pre-exist, non-blocking) |

## 6. Known-remaining, out of scope (not fixed, by design)

- **`secret-scan` (gitleaks) CI job** stays red on tracked `.env`-style files. This is the
  maintainer's credential-rotation task, deliberately not a PR blocker (per repo
  `DECISIONS.md` and prior guidance); it is unrelated to V4 or the restyle. Untouched.

## 7. Files changed

```
scraper/src/replay/correlation.ts                 co-presence: require declared fine accuracy
scraper/src/replay/types.ts                       GeoPoint.accuracyM contract
scraper/src/replay/__tests__/correlation.test.ts  fine-accuracy points + no-accuracy regression test
output/golden/ana_rivera_dev/case.json            recovered fixture + explicit geo accuracy
frontend/public/demo/*                            regenerated bundle (accuracy in sample posts)
frontend/src/tests/header.test.jsx                two-tone wordmark matcher
.gitignore                                        exclude CLI scratch output/golden/*/generated/
```
