// Run with: npx tsx --test src/replay/__tests__/custody.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCustodyChain, hashEntry, sha256, GENESIS } from "../custody.js";

test("empty chain yields genesis root hash", () => {
    const { entries, rootHash } = buildCustodyChain([]);
    assert.equal(entries.length, 0);
    assert.equal(rootHash, GENESIS);
});

test("first entry's prevHash is genesis", () => {
    const { entries } = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: sha256("hello") },
    ]);
    assert.equal(entries[0].prevHash, GENESIS);
    assert.equal(entries[0].seq, 1);
});

test("each entry chains to the previous entryHash", () => {
    const { entries } = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: sha256("a") },
        { step: "render-pdf", artifact: "report.pdf", sha256: sha256("b") },
    ]);
    assert.equal(entries[1].prevHash, entries[0].entryHash);
});

test("root hash is the final entry's hash and commits to all inputs", () => {
    const artifacts = [
        { step: "normalize", artifact: "report.json", sha256: sha256("a") },
        { step: "render-pdf", artifact: "report.pdf", sha256: sha256("b") },
    ];
    const { entries, rootHash } = buildCustodyChain(artifacts);
    assert.equal(rootHash, entries[entries.length - 1].entryHash);

    const e1 = hashEntry(1, "normalize", "report.json", sha256("a"), GENESIS);
    const e2 = hashEntry(2, "render-pdf", "report.pdf", sha256("b"), e1);
    assert.equal(rootHash, e2);
});

test("tampering with an earlier artifact changes the root hash", () => {
    const clean = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: sha256("a") },
        { step: "render-pdf", artifact: "report.pdf", sha256: sha256("b") },
    ]);
    const tampered = buildCustodyChain([
        { step: "normalize", artifact: "report.json", sha256: sha256("a-TAMPERED") },
        { step: "render-pdf", artifact: "report.pdf", sha256: sha256("b") },
    ]);
    assert.notEqual(clean.rootHash, tampered.rootHash);
});
