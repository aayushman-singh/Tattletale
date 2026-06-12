# V5 Session Summary

## User Outcome

Tattletale V5 now has a protected replay artifact API for sensitive replay outputs and a correlation pipeline that scales better by pruning expensive pair scoring while preserving evidence-backed merges.

## Scope Completed

- Added authenticated `/api/replay/:handle/intel-brief` and `/api/replay/:handle/network-graph` endpoints.
- Enforced per-case replay scopes through `caseAccess` without exposing those scopes in user profile responses.
- Locked replay artifact reads to `REPLAY_ARTIFACT_DIR` with realpath containment checks, symlink escape rejection, file identity validation after open, size limits, and fail-loud logging.
- Minimized replay payloads so public clients receive only approved intel brief and network graph fields.
- Added no-store replay headers and fail-closed replay CORS behavior.
- Reworked replay correlation to precompute account features, canonicalize deterministic inputs, reject duplicates, prune full scoring for weak large-input pairs, and keep bounded sparse pair state.
- Added an honest benchmark that reports behavioral pair checks, full-scored pair count, pruning rate, speedup, and planted-match recall.
- Added tests covering replay auth, scope denial, PII minimization, malformed artifacts, symlink/TOCTOU rejection, CORS/no-store behavior, duplicate input rejection, network evidence failures, timestamp validation, deterministic blocking, and large-input pruning.

## Non-Claims

- The correlation pass is not subquadratic. It still evaluates cheap behavioral pair signals across all pairs for large inputs.
- The pruning applies to expensive full scoring, co-presence, and evidence assembly for weak candidate pairs.
- Evidence-backed merge recall is preserved for the planted/covered V5 scenarios; weak threshold-only merges without supporting evidence are intentionally not promised.
- Public `/demo/*.json` synthetic artifacts remain public. Real or sensitive replay artifacts are served through protected `/api/replay` routes.

## Verification

- `cd c:/Repo/Tattletale/backend && npm test`
  - Pass: 2 suites, 34 tests.
- `cd c:/Repo/Tattletale/scraper && npm test`
  - Pass: 72 tests.
- `cd c:/Repo/Tattletale/scraper && npx tsx --test src/replay/__tests__/correlation.test.ts src/replay/__tests__/correlation.blocking.test.ts src/replay/__tests__/network.test.ts src/replay/__tests__/runReplay.test.ts`
  - Pass: 48 tests.
- `cd c:/Repo/Tattletale/scraper && npx tsx src/replay/bench/correlationBench.ts 200 500 1000 2000`
  - Pass. At 2000 accounts: 1,999,000 behavioral pairs, 11,059 full-scored pairs, 99.45% full-score pruning, 2.8x speedup, planted recall 20/20.
- `cd c:/Repo/Tattletale/scraper && npm run typecheck`
  - Fails in existing non-replay scraper files under `src/Helpers/*` and `src/routes/*`; no replay files were listed in the typecheck failures.

## Review

`codex/v5-scalable-correlation-review.md` reports: `No Critical/High/Medium findings.`
