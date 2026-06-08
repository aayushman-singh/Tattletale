// Run with: npx tsx --test src/replay/__tests__/runReplay.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReplay } from "../runReplay.js";

const FIXED_TS = "2026-06-08T12:00:00.000Z";
const HANDLE = "ana_rivera_dev";

function tmp() {
    return mkdtempSync(join(tmpdir(), "replay-test-"));
}

test("deterministic: same fixture + timestamp => same root hash", async () => {
    const a = tmp();
    const b = tmp();
    try {
        const r1 = await runReplay(HANDLE, a, FIXED_TS);
        const r2 = await runReplay(HANDLE, b, FIXED_TS);
        assert.equal(r1.rootHash, r2.rootHash, "root hashes must match");
        assert.equal(r1.rootHash.length, 64, "root hash is a sha256 hex digest");

        // Byte-for-byte identical report and PDF.
        const report1 = readFileSync(r1.reportPath);
        const report2 = readFileSync(r2.reportPath);
        assert.ok(report1.equals(report2), "report.json bytes identical");
        const pdf1 = readFileSync(r1.pdfPath);
        const pdf2 = readFileSync(r2.pdfPath);
        assert.ok(pdf1.equals(pdf2), "report.pdf bytes identical");
    } finally {
        rmSync(a, { recursive: true, force: true });
        rmSync(b, { recursive: true, force: true });
    }
});

test("changing the timestamp changes the root hash", async () => {
    const a = tmp();
    const b = tmp();
    try {
        const r1 = await runReplay(HANDLE, a, FIXED_TS);
        const r2 = await runReplay(HANDLE, b, "2030-01-01T00:00:00.000Z");
        assert.notEqual(r1.rootHash, r2.rootHash);
    } finally {
        rmSync(a, { recursive: true, force: true });
        rmSync(b, { recursive: true, force: true });
    }
});

test("missing fixture throws loudly with the handle and expected path", async () => {
    const out = tmp();
    try {
        await assert.rejects(
            () => runReplay("does_not_exist_handle", out, FIXED_TS),
            /No golden fixture for handle "does_not_exist_handle"/,
        );
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});

test("manifest root hash matches the run result and artifacts are non-empty", async () => {
    const out = tmp();
    try {
        const r = await runReplay(HANDLE, out, FIXED_TS);
        const manifest = JSON.parse(readFileSync(r.manifestPath, "utf8"));
        assert.equal(manifest.rootHash, r.rootHash);
        assert.equal(manifest.artifacts.length, 2);

        const custody = JSON.parse(readFileSync(r.custodyLogPath, "utf8"));
        assert.equal(custody.length, 2);
        assert.equal(custody[custody.length - 1].entryHash, r.rootHash);

        assert.ok(statSync(r.pdfPath).size > 1000, "pdf should be a real document");
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});
