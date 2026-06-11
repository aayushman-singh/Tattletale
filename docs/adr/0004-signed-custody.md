# 0004 — Cryptographically sealed chain of custody

**Status:** Accepted — Ed25519 seal implemented; RFC 3161 trusted timestamp + HSM key designed.

## Context

The replay pipeline already builds an append-only SHA-256 **hash chain** over the
case artifacts (report, correlation, PDF): each entry binds an artifact's content
hash to the previous entry, so altering or reordering any artifact breaks the
root hash (see ADR on chain-of-custody / the README diagram). A reviewer noted the
honest limitation: a hash chain proves the artifacts are internally consistent,
but on its own it does not prove **who** produced the bundle, nor stop someone
from regenerating a fresh, internally-consistent chain over altered data. For an
evidentiary artifact you need *attribution* and a *trusted time*.

## Decision

**Seal the root hash with an Ed25519 signature, and ship the public key +
signature in the manifest.** (`scraper/src/replay/sign.ts`.)

- The signer's private key is generated at sealing time and **never written to
  disk or committed** — only the SPKI public key and the detached base64
  signature go into `manifest.json`. This keeps the repo free of any private key
  (so the gitleaks CI gate stays green) while making every bundle independently
  verifiable: `verifySeal(rootHash, manifest.seal)` recomputes the check with the
  embedded public key, and any tamper to the root hash fails it.
- Ed25519 over `node:crypto` — no third-party crypto dependency, deterministic
  verification, small signatures.

## Consequences

- **What this buys:** the bundle is now *tamper-evident AND attributable*. A
  verifier can confirm the artifacts hash to the sealed root and that the seal was
  produced by the holder of the published key.
- **What it does NOT yet buy (designed, not built):**
  1. **Identity binding** — the demo key is ephemeral. Court-grade use needs the
     key held in an **HSM / smartcard** bound to the examiner's identity, so the
     public key means something.
  2. **Trusted time** — a self-asserted timestamp can be back-dated. The next step
     is an **RFC 3161** timestamp from an external Time Stamping Authority over the
     root hash, countersigning *when* the seal existed. This needs network access
     to a TSA and therefore does not run in the offline/keyless demo.
- **No overclaiming.** The UI, PDF, and README state plainly that this
  demonstrates the *mechanism* (tamper-evidence + attribution) and is not, by
  itself, court-grade until the HSM key and RFC 3161 timestamp are added.
