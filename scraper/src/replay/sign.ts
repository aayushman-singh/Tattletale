// Cryptographic seal for the custody manifest.
//
// The hash chain proves the artifacts weren't altered relative to each other;
// the signature proves WHO sealed the bundle and that the root hash hasn't been
// swapped wholesale. We sign the root hash with an Ed25519 key.
//
// SECURITY MODEL (honest): the signing key is generated at sealing time and
// NEVER written to disk or committed — only the public key + signature ship in
// the manifest, so the bundle is independently verifiable but the repo holds no
// private key (gitleaks-safe). This makes the bundle *tamper-evident and
// attributable*. To be court-grade you additionally need (a) the key held in an
// HSM / smartcard tied to the examiner's identity and (b) an RFC 3161 trusted
// timestamp from an external TSA so the seal time can't be back-dated. Both are
// documented as the remaining step in ADR-0004; neither runs offline in a demo.

import {
    generateKeyPairSync,
    sign as cryptoSign,
    verify as cryptoVerify,
    createPublicKey,
    createHash,
    type KeyObject,
} from "node:crypto";

export interface SignatureBlock {
    algorithm: "Ed25519";
    signedField: "rootHash";
    // "demo-ephemeral": key minted at sealing time, no external trust anchor — so
    // this proves internal integrity + that ONE key signed it, NOT custody
    // attribution. A real deployment uses "hsm" with a pinned, examiner-bound key.
    mode: "demo-ephemeral" | "hsm";
    keyId: string; // sha256(publicKeyPem)[:16] — lets a verifier pin an expected key
    publicKeyPem: string;
    signature: string; // base64 detached signature over the rootHash bytes
    note: string;
}

export interface KeyPair {
    publicKey: KeyObject;
    privateKey: KeyObject;
}

export function generateSigningKey(): KeyPair {
    return generateKeyPairSync("ed25519");
}

/**
 * Seal a root hash. Returns the signature block to embed in the manifest.
 * The private key is used here and then goes out of scope — it is never returned
 * to a caller that would persist it.
 */
export function sealRootHash(rootHash: string, keyPair?: KeyPair): SignatureBlock {
    const { publicKey, privateKey } = keyPair ?? generateSigningKey();
    const signature = cryptoSign(null, Buffer.from(rootHash, "utf8"), privateKey);
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    return {
        algorithm: "Ed25519",
        signedField: "rootHash",
        mode: "demo-ephemeral",
        keyId: createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 16),
        publicKeyPem,
        signature: signature.toString("base64"),
        note:
            "Demo seal: key generated at sealing time, not persisted, no external trust anchor. " +
            "It proves the artifacts are internally consistent and that one key signed them — NOT " +
            "custody attribution. Court-grade use requires an HSM-held examiner key (mode: hsm) " +
            "pinned by keyId + an RFC 3161 trusted timestamp (see ADR-0004).",
    };
}

/**
 * Verify a signature block against a root hash. Pure, no I/O.
 *
 * Pass `expectedPublicKeyPem` to PIN the signer: a demo seal verifies against its
 * own embedded key (integrity only), but a real verifier supplies the examiner's
 * known key so a malicious re-seal with a fresh key is rejected.
 */
export function verifySeal(
    rootHash: string,
    block: SignatureBlock,
    expectedPublicKeyPem?: string,
): boolean {
    try {
        if (expectedPublicKeyPem) {
            const norm = (p: string): string =>
                createPublicKey(p).export({ type: "spki", format: "pem" }).toString().trim();
            if (norm(expectedPublicKeyPem) !== norm(block.publicKeyPem)) return false;
        }
        const publicKey = createPublicKey(block.publicKeyPem);
        return cryptoVerify(
            null,
            Buffer.from(rootHash, "utf8"),
            publicKey,
            Buffer.from(block.signature, "base64"),
        );
    } catch {
        // A malformed key/signature is a verification failure, not a crash.
        return false;
    }
}
