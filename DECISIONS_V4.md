# DECISIONS_V4 — autonomous calls (no user blocking)

## D1 — Update stale brief tests, not the guard
The FUNCTION_WORDS rewrite (PR #13) is the principled guard; the 3 failing tests
encoded the old, weaker STRUCTURAL_WORDS behavior. Per handoff, updated tests to
the new behavior rather than weakening the guard. Test intent preserved: reject
hallucinated PLACE/PERSON/NUMBER, accept faithful rephrasings.

## D2 — Fix telegram.py F821 inside PR #13
Pre-existing `python` CI red, unrelated to the brief but a genuine import-time
NameError and in deploy-boundary scope (templated secrets). Fixed as a separate
atomic commit on the same branch to bring one more check green. Bias-ambitious.

## D3 — Leave secret-scan red (user-only)
`backend/.env` + `scraper/.env` are tracked and trip gitleaks. Rule #2 fences
leaked-credential remediation as a user-only rotation/history task. Not touched.
PR #13 was merged accepting this pre-existing red (main is already red on it),
since #13 does not introduce it and cannot satisfy it without out-of-scope work.

## D4 — Co-presence is an applicability-gated overlay with behavioural-only merges
The 7th signal does NOT take a slice of the convex weight when geo is absent —
that would dilute the six well-calibrated behavioural signals on every geo-less
case and change their hashes. Instead it is an overlay (weight 0.1) applied only
when both accounts have >= 2 capture-grade geo posts; otherwise the six renormalize
to 1.0 (byte-identical to the prior engine). Merges are decided on the six
behavioural signals ALONE (baseMatrix) — co-presence can raise score/cohesion and
flag a link but can never collapse two behaviourally-distinct people. This is the
forensic guarantee the handoff demanded ("geo must not merge a coarse-city namesake").

## D5 — Apply both Codex passes, reject only the null-geo nit
Codex pass 1 (3 Critical) and pass 2 (2 High + 1 Medium) findings were all real and
applied. Only rejected: treating `geo: null` as malformed — `null`/absent is a
legitimate "no location recorded" state (neutral); a present-but-malformed geo
object already fails loudly via validatedGeo.
