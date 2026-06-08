// One-shot migration: replace hardcoded MongoDB Atlas URIs / creds with env reads.
// Deterministic, idempotent, reports every change. Run from repo root: node scripts/strip-secrets.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const SECRET_URI =
    /"mongodb\+srv:\/\/aayushman2702:Lmaoded%4011@cluster0\.eivmu\.mongodb\.net\/(\w+)\?retryWrites=true&w=majority"/;
const changes = [];

function edit(rel, fn) {
    const p = join(root, rel);
    if (!existsSync(p)) {
        console.error(`SKIP (missing): ${rel}`);
        return;
    }
    const before = readFileSync(p, "utf8");
    const after = fn(before);
    if (after !== before) {
        writeFileSync(p, after, "utf8");
        changes.push(rel);
        console.log(`patched: ${rel}`);
    } else {
        console.log(`no-change: ${rel}`);
    }
}

const tsMongooseRoutes = [
    "discord.ts", "facebook.ts", "gdrive.ts", "gmail.ts", "google.ts",
    "instagram.ts", "mastodon.ts", "timeline.ts", "whatsapp.ts", "x.ts", "youtube.ts",
];

for (const f of tsMongooseRoutes) {
    edit(`scraper/src/routes/${f}`, (s) => {
        let out = s.replace(SECRET_URI, (_m, db) => `mongoUri("${db}")`);
        if (out.includes("mongoUri(") && !out.includes('Helpers/mongoUri.js')) {
            out = `import { mongoUri } from "../Helpers/mongoUri.js";\n` + out;
        }
        return out;
    });
}

// log.ts — leaked password in a variable + a comment; route through helper.
edit("scraper/src/routes/log.ts", (s) => {
    let out = s
        .replace(
            /\/\/ Original problematic URL:\n\/\/ mongodb\+srv:\/\/aayushman2702:Lmaoded@11@cluster0\.eivmu\.mongodb\.net\/logDB\?retryWrites=true&w=majority\n\n\/\/ Special characters in the password need to be properly encoded\nconst password = encodeURIComponent\('Lmaoded@11'\);\nconst mongoUrl = `mongodb\+srv:\/\/aayushman2702:\$\{password\}@cluster0\.eivmu\.mongodb\.net\/logDB\?retryWrites=true&w=majority`;/,
            `const mongoUrl = mongoUri("logDB");`,
        );
    if (out.includes("mongoUri(") && !out.includes("Helpers/mongoUri.js")) {
        out = `import { mongoUri } from "../Helpers/mongoUri.js";\n` + out;
    }
    return out;
});

// Python pdf generators + telegram.py — select db explicitly, so just swap the literal.
const pyFiles = [
    "frontend/pdf_conv/discord.py",
    "frontend/pdf_conv/google_drive.py",
    "frontend/pdf_conv/mastodon.py",
    "frontend/pdf_conv/twitter.py",
    "frontend/pdf_conv/whatsapp.py",
    "frontend/pdf_conv/youtube.py",
    "scraper/src/routes/telegram.py",
];
const PY_URI =
    /(['"])mongodb\+srv:\/\/aayushman2702:Lmaoded%4011@cluster0\.eivmu\.mongodb\.net\/\w*\?retryWrites=true&w=majority(&appName=Cluster0)?\1/g;
for (const f of pyFiles) {
    edit(f, (s) => {
        let out = s.replace(PY_URI, 'os.environ["MONGODB_URI"]');
        if (out.includes('os.environ["MONGODB_URI"]') && !/^import os$/m.test(out)) {
            out = `import os\n` + out;
        }
        return out;
    });
}

// mobileScraper creds.
edit("mobileScraper/src/index.ts", (s) =>
    s
        .replace(
            /let username = 'aayushman3260';/,
            `let username = process.env.IG_USERNAME;`,
        )
        .replace(
            /let password = 'testing@27';/,
            `let password = process.env.IG_PASSWORD;\nif (!username || !password) {\n    throw new Error("IG_USERNAME and IG_PASSWORD must be set (see .env.example). mobileScraper is prototype-only.");\n}`,
        ),
);

// App.jsx OAuth client id.
edit("frontend/src/App.jsx", (s) =>
    s.replace(
        /clientId="218022995131-pkv99vvugfmhr73ua600lg44q362bbsj\.apps\.googleusercontent\.com"/,
        `clientId={import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID}`,
    ),
);

console.log(`\n=== ${changes.length} files patched ===`);
