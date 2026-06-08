// Run with: npx tsx --test src/replay/__tests__/sign.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSigningKey, sealRootHash, verifySeal } from "../sign.js";

const ROOT = "a".repeat(64);

test("seal then verify round-trips", () => {
    const block = sealRootHash(ROOT);
    assert.equal(block.algorithm, "Ed25519");
    assert.ok(block.publicKeyPem.includes("BEGIN PUBLIC KEY"));
    assert.ok(verifySeal(ROOT, block), "freshly sealed root must verify");
});

test("a tampered root hash fails verification", () => {
    const block = sealRootHash(ROOT);
    assert.equal(verifySeal("b".repeat(64), block), false);
});

test("a signature from a different key does not verify", () => {
    const block = sealRootHash(ROOT, generateSigningKey());
    const other = sealRootHash(ROOT, generateSigningKey());
    // swap the signature from `other` onto `block`'s public key
    const forged = { ...block, signature: other.signature };
    assert.equal(verifySeal(ROOT, forged), false);
});

test("the private key is never exposed by the signature block", () => {
    const block = sealRootHash(ROOT);
    const serialized = JSON.stringify(block);
    assert.ok(!serialized.includes("PRIVATE KEY"), "no private key may leak into the manifest");
});

test("block declares its ephemeral demo mode and a key id", () => {
    const block = sealRootHash(ROOT);
    assert.equal(block.mode, "demo-ephemeral");
    assert.equal(block.keyId.length, 16);
});

test("pinning an expected key rejects a re-seal with a different key", () => {
    const examiner = generateSigningKey();
    const trusted = sealRootHash(ROOT, examiner);
    const examinerPem = examiner.publicKey.export({ type: "spki", format: "pem" }).toString();
    // Verifies against the examiner's known key.
    assert.ok(verifySeal(ROOT, trusted, examinerPem));
    // An attacker re-seals the same root with their own key — must be rejected
    // when the verifier pins the examiner's key, even though it self-verifies.
    const forged = sealRootHash(ROOT, generateSigningKey());
    assert.ok(verifySeal(ROOT, forged), "forged seal self-verifies (integrity only)");
    assert.equal(verifySeal(ROOT, forged, examinerPem), false, "but fails against the pinned key");
});
