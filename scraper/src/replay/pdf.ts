// Renders the case report + chain-of-custody hashes to a PDF using pdfkit.
// Runs fully offline. Returns the PDF bytes so the caller hashes the exact
// bytes that get written to disk (keeping the manifest honest).

import PDFDocument from "pdfkit";
import type { CaseReport, CustodyEntry } from "./types.js";

export function renderPdf(
    report: CaseReport,
    custody: CustodyEntry[],
    rootHash: string,
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        // Deterministic creation date so the same inputs produce identical PDF
        // bytes (pdfkit otherwise stamps Date.now() into the metadata).
        const doc = new PDFDocument({
            margin: 50,
            info: {
                Title: `Tattletale Replay Report — ${report.handle}`,
                Author: "Tattletale (replay mode)",
                CreationDate: new Date(report.generatedAt),
            },
        });

        const chunks: Buffer[] = [];
        doc.on("data", (c: Buffer) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        const blue = "#2563eb";
        const gray = "#6b7280";

        // Header
        doc.fillColor(blue).fontSize(22).text("Tattletale — OSINT Case Report");
        doc.moveDown(0.2);
        doc.fillColor(gray).fontSize(10).text("REPLAY MODE · 100% SYNTHETIC DATA · NO LIVE SCRAPE");
        doc.moveDown(0.5);
        doc.fillColor("#111827").fontSize(14).text(`${report.target.displayName}  (@${report.handle})`);
        doc.fillColor(gray).fontSize(10).text(report.target.summary);
        doc.text(`Generated: ${report.generatedAt}`);
        doc.text(`Platforms covered: ${report.platformCount}`);
        doc.moveDown(0.5);
        doc.fillColor("#b91c1c")
            .fontSize(9)
            .text(report.notice);
        doc.moveDown(1);

        // Findings
        doc.fillColor(blue).fontSize(14).text("Per-platform findings");
        doc.moveDown(0.3);
        for (const f of report.findings) {
            doc.fillColor("#111827")
                .fontSize(12)
                .text(`${f.platform.toUpperCase()}  ·  @${f.username}${f.verified ? "  (verified)" : ""}`);
            doc.fillColor(gray).fontSize(9);
            doc.text(`${f.displayName} — ${f.bio}`);
            doc.text(
                `Followers: ${f.metrics.followers.toLocaleString()}   Following: ${f.metrics.following.toLocaleString()}   Posts: ${f.metrics.posts.toLocaleString()}`,
            );
            doc.text(`URL: ${f.url}`);
            for (const p of f.samplePosts) {
                doc.fillColor("#374151").fontSize(9).text(`  • [${p.timestamp}] ${p.caption}`, { indent: 8 });
            }
            doc.moveDown(0.5);
        }

        // Cross-platform matches
        doc.moveDown(0.3);
        doc.fillColor(blue).fontSize(14).text("Cross-platform identity matches");
        doc.moveDown(0.3);
        for (const m of report.crossPlatformMatches) {
            doc.fillColor("#111827")
                .fontSize(10)
                .text(`@${m.username}  [${m.confidence.toUpperCase()}]  →  ${m.platforms.join(", ")}`);
            doc.fillColor(gray).fontSize(9).text(`   ${m.evidence}`);
        }
        doc.moveDown(1);

        // Chain of custody
        doc.addPage();
        doc.fillColor(blue).fontSize(14).text("Chain of custody");
        doc.fillColor(gray)
            .fontSize(9)
            .text(
                "Append-only SHA-256 hash chain. Each entry binds an artifact's content hash to the previous entry, so any tampering or reordering breaks the root hash below.",
            );
        doc.moveDown(0.5);
        for (const e of custody) {
            doc.fillColor("#111827").fontSize(10).text(`#${e.seq}  ${e.step}  —  ${e.artifact}`);
            doc.fillColor(gray).fontSize(8);
            doc.text(`   sha256:   ${e.sha256}`);
            doc.text(`   prevHash: ${e.prevHash}`);
            doc.text(`   entry:    ${e.entryHash}`);
            doc.moveDown(0.3);
        }
        doc.moveDown(0.5);
        doc.fillColor("#b91c1c").fontSize(11).text("ROOT HASH (integrity seal):");
        doc.fillColor("#111827").fontSize(9).text(rootHash);

        doc.end();
    });
}
