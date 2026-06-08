# SESSION SUMMARY V2 — Tattletale "go big" (2026-06-08)

Phase 2 picks up where Phase 1 (`SESSION_SUMMARY.md`) left off. Phase 1 made the
codebase honest; **Phase 2 makes the forensic value proposition real and
visible.** All work is on branch `hardening/autonomous-session` (5 new commits on
top of Phase 1, nothing pushed). Working tree clean.

## The leap: from "replay demo" to "tool you'd trust near a case"

The README + ADR-0003 claimed a **cross-identity correlation algorithm**, but the
replay pipeline only read **hand-written `crossPlatformMatches`** from each
fixture — the "algorithm" was a hardcoded assertion. Phase 2 closes that gap and
adds cryptographic custody.

### 1. Real cross-identity correlation engine (`scraper/src/replay/correlation.ts`)
Deterministic, explainable, no network. Given the accounts seen for a target it
scores every pair on six observable signals — **handle** (Jaro-Winkler),
**display name**, **bio** overlap, a **stylometric fingerprint** (punctuation,
casing, a non-ASCII/language tell, function-word rates), **posting hour-of-day**,
and **shared distinctive vocabulary** — then agglomerates accounts into
identities. Every edge carries its per-feature contribution, so the tool shows
*why* two handles were (or were not) linked.

The forensically important behaviour is the **negative** result: a same-named
"Ana Rivera" (a Spanish-speaking home cook posting at midday) is **flagged but
held separate** from the developer "Ana Rivera" (three accounts posting code at
night) — because a shared *name* is weak evidence and the *behaviour* doesn't
match. The engine refuses the false attribution. This is the credibility
difference between a demo and a forensic tool.

Design choices that make it defensible (and that survived two adversarial codex
rounds): behavioural signals are **coverage-gated** by post count (so name+handle
alone can't merge a namesake); clustering uses a **complete-linkage guard**
(every cross-pair in a merged identity must itself be merge-strength — no
transitive over-merge); input is **canonicalized** so the graph and root hash are
order-independent; the cluster score is called **`cohesion`** (a heuristic, null
for singletons) and explicitly **not** a calibrated probability.

### 2. Identity graph on `/demo` (`frontend/src/components/demo/IdentityGraph.jsx`)
A dependency-free SVG graph (the engine emits deterministic layout coordinates).
Accounts are nodes; edges are coloured/dashed by **merge state** (green solid =
linked, amber dashed = flagged-not-merged). Click any edge to see the per-feature
evidence behind it. A recruiter watches three accounts collapse into one identity
and a fourth same-named account get correctly kept apart.

### 3. Cryptographically sealed custody (`scraper/src/replay/sign.ts`, ADR-0004)
The custody root hash is now **Ed25519-signed**. The manifest ships the public
key + signature + `keyId`; the private key is generated at sealing time and
**never persisted** (so the gitleaks gate stays green). `verifySeal()` validates
the declared scheme and can **pin an expected key** so a malicious re-seal with a
fresh key is rejected. The seal is honestly labelled `demo-ephemeral`; ADR-0004
documents the HSM key + RFC 3161 trusted timestamp needed to be court-grade.

The correlation artifact and the signature are folded into the chain of custody,
so the **analysis** is tamper-evident, not just the raw findings.

## Verification (evidence, not assertions)
- `scraper && npm test` → **32 passing** (was 14 at Phase 1 close): correlation
  engine, signing, and adversarial cases (empty-posts no-merge, one-post no-merge,
  complete-linkage over-merge guard, input-order determinism, invalid-timestamp
  throw, scheme-rejection, key-pinned verification).
- `frontend && npm run build` → clean; the `/demo` bundle (incl. `correlation.json`)
  ships in `dist/demo/`.
- Driven live with Playwright: graph renders, edge selection works, identities
  resolve correctly (3 merged @ cohesion 0.76, namesake separate).
- Demo root hash (current fixture): `bfebc2a9734468a1f6817947773153de4f6401ec0ef34f51eddfff11bdb60da0`.

## Codex review (per HANDOFF rule)
Three Phase-2 codex passes (`codex/*-phase2*.md`, all scrubbed to findings-only):
1. Initial review → NO-GO, 5 blockers + highs → all fixed.
2. Verification review → NO-GO, 1 high + 5 mediums/lows → all fixed (strict
   complete-linkage threshold, coverage-gated merge, seal scheme validation,
   dropped the unimplementable `hsm` mode, `confidence`→`band`, stronger tests).
Dispositions tracked in `DECISIONS.md` (D7–D9).

## What changed (by area)
- **scraper/src/replay/**: new `correlation.ts`, `sign.ts`; `types.ts`,
  `report.ts`, `runReplay.ts`, `pdf.ts`, `cli.ts` extended; 3 new/expanded test files.
- **frontend**: new `IdentityGraph.jsx`; `demo/index.jsx` wires the graph, a
  "correlate" pipeline step, and the signature display.
- **fixtures**: enriched `ana_rivera_dev` (consistent posting rhythm + shared
  vocabulary across her accounts, plus a namesake decoy); removed the now-unused
  hardcoded matches from all fixtures; regenerated + synced the demo bundle.
- **docs**: ADR-0003 (scorer now implemented), new ADR-0004, README correlation
  section + graph screenshot.

## Blocked on user (unchanged from Phase 1, still required before any public push)
Rotate the leaked Atlas password + Google OAuth client secret + service-account
key; scrub git history; deploy to Vercel; build/sign the APK; remove the session
scratchpads (`HANDOFF*.md`, `STATE.md`, `DECISIONS.md`, `SESSION_SUMMARY*.md`)
before making the repo public; then `git push` the branch. See
`SESSION_SUMMARY.md` → "Blocked on user".

## Residuals (designed, not built — documented in ADR-0003/0004)
A calibrated probability model for the link score; perceptual profile-image
hashing + link/email/phone co-occurrence; wiring the scorer into the live
Mongo-backed pipeline; an HSM-held examiner key + RFC 3161 trusted timestamp.
