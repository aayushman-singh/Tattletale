Line refs are to the supplied diff.

1. **[Critical] `coPresence(a, b)` is asymmetric/order-dependent** (`correlation.ts:279`). It counts only posting occasions on `a`. If A has 3 nearby posts and B has 1, `A,B` scores `1.0`; `B,A` scores `0.333`. Account order can change score, edge floor, and merge outcome. The determinism test only checks same input twice, not permutation invariance.

2. **[Critical] The namesake-merge guard is not real** (`scorePair`). `score = 0.9 * base + 0.1 * coPresence` means co-presence can be the decisive push over `MERGE_THRESHOLD`. Complete-linkage does nothing for a two-account identity. If geo must not collapse namesakes, merge eligibility needs a behavioural threshold independent of geo.

3. **[Critical] `GeoPoint` has no accuracy/granularity/provenance** (`types.ts`). Every lat/lon is treated as fine capture location. If upstream stores a city or venue centroid, two distinct people who merely share a city can look distance `0` and get full co-presence. This directly violates the “coarse shared city must not merge” claim.

4. **[High] Missing geo is only neutral at whole-account level** (`coPresence`). If both accounts have one geotagged post, the signal becomes applicable and all other missing post-level geo can effectively become negative evidence by scaling base signals to `0.9`. Sparse metadata is being punished.

5. **[High] “Independent occasions” are not enforced** (`coPresence` loop). Three duplicate posts, or three posts in the same 30-minute burst, can saturate the signal against one matching post on the other account. `.some()` reuses the same B post unlimited times. This is false evidence and easy to game.

6. **[High] The signal is spam-gameable.** More geotagged posts on account A means more chances to hit any B post, with no normalization for posting volume or expected random coincidence rate. An attacker can inflate co-presence by posting repeatedly from/near the target location.

7. **[High] The geo trust boundary is missing.** Manual venue tags, scheduled posts, imported metadata, or geocoded place names are accepted as capture-location evidence. Under the all-or-nothing rule, untrusted geo should be inapplicable or rejected, not scored.

8. **[Medium] Timestamp parsing is not deterministic enough** (`Date.parse`). Strings without explicit timezone parse in local time; non-standard strings are implementation-dependent; some malformed dates can normalize instead of failing. Require strict ISO-8601 with `Z`/offset and reject everything else.

9. **[Medium] `geo: null` is silently treated as absent** (`validatedGeo`). That is malformed input, not missing input. The current truthiness check violates the fail-loud rule for bad evidence.

10. **[Medium] Reported global weights are misleading** (`correlate` metadata). `{ ...WEIGHTS, coPresence: 0.1 }` advertises weights that can sum above `1.0`, while actual base weights are conditionally scaled per edge. Consumers cannot reconstruct scoring from the metadata.

11. **[Medium] The “coarse shared city” test is weak** (`correlation.test.ts`). It uses two precise points 7km apart, so it only proves distance rejection. It does not test city centroids, rounded coordinates, same venue/campus, or a namesake pair where co-presence pushes the score over merge.

12. **[Low/Medium] The `GeoPoint` comment is false** (`types.ts`). It says absent geo makes co-presence inapplicable for any pair touching that post’s account. Implementation says pair-level applicability starts once each account has any geo-stamped post. That mismatch will mislead fixture producers.

---

## Codex pass 2 (hardened diff)

**Findings**
- **High** - Sparse/capture-grade geo is not actually neutral. `geoStamps()` counts every valid geo point toward coverage, but `coLocated()` later rejects coarse `accuracyM` points. So two coarse-only posts per side make `coPresence()` applicable, add a zero-valued feature, and scale behaviour by `0.9` instead of renormalizing it out. That violates guarantee (4). See [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:274), [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:301), [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:316), [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:418).

- **Medium** - Duplicate-burst immunity only holds one-sided. The one-to-one matcher consumes posts, not real-world occasions. If both accounts emit three duplicate posts at the same place/time, greedy matching counts three occasions and saturates `coPresence` to `1`, even though there was one actual occasion. Existing test coverage only checks many-to-one. See [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:330) and [correlation.test.ts](C:/Repo/Tattletale/scraper/src/replay/__tests__/correlation.test.ts:299).

- **High** - Determinism still has host-dependent paths. Non-geo timestamps still go through `new Date(p.timestamp).getUTCHours()`, while strict timezone validation only applies inside `geoStamps()`. A timezone-less non-geo timestamp can score differently by host timezone. Account canonicalization also uses default `localeCompare`, which can vary for non-ASCII identifiers by locale/ICU. See [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:216) and [correlation.ts](C:/Repo/Tattletale/scraper/src/replay/correlation.ts:512).

Guarantee (1) holds: merge candidates and complete-linkage use `baseMatrix`, not co-presence. Guarantee (3) holds narrowly for explicit `accuracyM > 250`: those points cannot co-locate at distance 0.

I could not run the test suite: `npm test --prefix scraper` was rejected by the sandbox policy.
