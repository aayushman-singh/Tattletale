// Chain-of-custody primitives. Pure functions over bytes and strings — no clock,
// no filesystem. The CLI supplies the real timestamp; tests supply a fixed one,
// so the same fixture + timestamp always yields the same root hash.

import { createHash } from "node:crypto";
import type { CustodyEntry } from "./types.js";

const GENESIS = "0".repeat(64);

export function sha256(data: Buffer | string): string {
    return createHash("sha256").update(data).digest("hex");
}

/**
 * Hash of a single custody entry: binds its position, the artifact it covers,
 * that artifact's content hash, and the previous entry's hash. Any tampering
 * with an earlier artifact or a reordering breaks every downstream entryHash.
 */
export function hashEntry(
    seq: number,
    step: string,
    artifact: string,
    artifactSha256: string,
    prevHash: string,
): string {
    return sha256(`${seq}\n${step}\n${artifact}\n${artifactSha256}\n${prevHash}`);
}

export interface ArtifactInput {
    step: string;
    artifact: string; // relative path label recorded in the log
    sha256: string; // hash of the artifact's bytes
}

/**
 * Fold an ordered list of artifacts into an append-only hash chain. The root
 * hash is the entryHash of the final entry, so it commits to every artifact and
 * their order. Genesis prevHash is 64 zeros.
 */
export function buildCustodyChain(artifacts: ArtifactInput[]): {
    entries: CustodyEntry[];
    rootHash: string;
} {
    const entries: CustodyEntry[] = [];
    let prevHash = GENESIS;
    artifacts.forEach((a, i) => {
        const seq = i + 1;
        const entryHash = hashEntry(seq, a.step, a.artifact, a.sha256, prevHash);
        entries.push({
            seq,
            step: a.step,
            artifact: a.artifact,
            sha256: a.sha256,
            prevHash,
            entryHash,
        });
        prevHash = entryHash;
    });
    const rootHash = entries.length > 0 ? entries[entries.length - 1].entryHash : GENESIS;
    return { entries, rootHash };
}

export { GENESIS };
