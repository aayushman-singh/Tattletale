# Tattletale

> An investigator is staring at a target's Instagram. They have six hours, nine platforms to check, and a chain-of-custody log to file. Tattletale runs while they make coffee.

Social media intelligence scraper for investigators. Point it at a handle, walk away, come back to a court-ready report. **Smart India Hackathon '24 winner. Deployed by the National Investigation Agency (NIA), Government of India.**

[![License](https://img.shields.io/badge/License-MIT-c8693d?style=flat)](LICENSE) [![SIH '24](https://img.shields.io/badge/SIH%20'24-Winner-1f6feb?style=flat)](https://www.sih.gov.in/) [![Deployed](https://img.shields.io/badge/Deployed-NIA-3a8a5f?style=flat)](#recognition)

---

## What it does, in plain English

Give Tattletale a username. It logs into nine platforms on your behalf, walks the target's posts, comments, contacts, and metadata, runs the handle against 2,500+ OSINT sites, and hands back:

- a **PDF report** — timeline, geo signals, contact graph, screenshots, hashes
- a **structured JSON dump** — same data, machine-readable, ready for a case-management system
- an **encrypted archive** of the raw artifacts — for chain of custody

Platforms covered: Instagram · X/Twitter · WhatsApp · Telegram · Facebook · Discord · Mastodon · YouTube · Google Drive.

The investigator's job shifts from *capturing* to *reading*.

## Why this is on GitHub

This is the same codebase the NIA runs. That is unusual — surveillance-grade software almost never gets open-sourced, and the few times it does, the public version is a hollowed-out demo. This one is not.

It is public for two reasons:

1. **Teaching.** Most OSINT tutorials stop at one platform and a screenshot. The hard part — session management, rate limits, cross-platform identity correlation, chain-of-custody-grade output — is rarely shown end-to-end. This repo shows it.
2. **Transparency.** Tools that scrape people deserve to be auditable. If you want to know what the government's investigators can see, read the source.

What was stripped: live credentials, session cookies, real targets' scrape outputs. What was kept: every line of working logic.

## Status

| Aspect | State |
| --- | --- |
| Production deployment | Private NIA fork, hardened |
| Public repo | Educational reference — runnable with your own credentials |
| Credentials in history | Scrubbed to `YOUR_*` placeholders via `git filter-repo` |
| Live cookie sessions | Removed from history, replaced with `session.example.json` |
| Personal scrape outputs (PDFs) | Removed from history |

## Features

- **9-platform scraping** — Instagram, X/Twitter, WhatsApp, Telegram, Facebook, Discord, Mastodon, YouTube, Google Drive
- **OSINT enrichment** — Maigret across 2,500+ sites, automated
- **Timeline + geo capture** — temporal and location tagging wherever the platform exposes it
- **Cross-identity correlation** — same person, different handles, stitched together
- **Court-ready output** — PDF + JSON with hashes, ready for chain of custody
- **Encrypted storage** — at-rest encryption, optional Google Drive upload
- **AI/ML layer** — entity extraction, summarization, visualization
- **Multi-surface** — web dashboard, mobile app, standalone Windows scraper

## Flowchart

<img src="./Readme Section Flowchart.png" alt="Tattletale architecture flowchart"/>

## Sample output

A run produces a directory like:

```
output/<case-id>/
├── report.pdf                  Investigator-readable, paginated, hashed
├── report.json                 Same data, structured, for ingest
├── timeline.csv                Every post/message with timestamp + platform
├── contact_graph.graphml       Nodes = handles, edges = interactions
├── osint/
│   ├── maigret.html            2,500-site sweep
│   └── matches.json
├── artifacts/
│   ├── instagram/              Screenshots, originals, hashes
│   ├── telegram/
│   └── ...
└── chain_of_custody.log        Append-only, signed
```

## Stack

**Backend** — Node.js · Python 3.10.15 · Express · MongoDB · Mongoose · bcrypt · JWT
**Scraping** — TypeScript · Crawlee · Playwright · Telethon · Puppeteer
**Frontend** — React · Tailwind CSS
**Mobile** — Flutter · Dart
**OSINT** — Maigret
**Storage** — MongoDB · AWS S3 · Google Drive (optional)

## Setup

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 22.11.0 |
| Python | 3.10.15 |
| npm | latest |
| pip | latest |

### Install

```bash
git clone https://github.com/aayushman-singh/Tattletale.git
cd Tattletale

# Python
python -m venv venv
# Windows:  .\venv\Scripts\activate
# Unix/Mac: source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Node (root + subprojects)
npm install
cd scraper && npm install && cd ..
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### Credentials

Every secret in this repo is a `YOUR_*` placeholder. Copy the shims, fill them, rename:

```bash
cp .env.example .env
cp google.example.json google.json
cp session.example.json session.json   # only if you want Playwright cookie-jar mode
```

| Shim file | Represents | How to get the real one |
| --- | --- | --- |
| `.env.example` | All API keys + secrets | Per-service signup (AWS, MongoDB, Telegram API, etc.) |
| `google.example.json` | Google OAuth web client config | `console.cloud.google.com` → APIs & Services → Credentials |
| `session.example.json` | Playwright cookie jar | Run the platform's headed login flow once |

**Telegram session files** — see [SESSIONS.md](SESSIONS.md). Generate per-phone `.session` files via the Telethon login flow. **Never commit them.**

### Run

```bash
# Backend API
cd backend && npm run dev

# Scraper (separate terminal)
cd scraper && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

## Project structure

```
Tattletale/
├── backend/                Node.js + Express API
├── scraper/                TypeScript scrapers (Crawlee + Playwright)
│   └── src/Helpers/        Per-platform helpers (Telegram, WhatsApp, etc.)
├── frontend/               React + Tailwind dashboard
├── mobileApp/              Flutter Android/iOS client
├── mobileScraper/          Flutter scraper variant
├── docker/                 Container definitions
├── *.example               Credential shims (copy → rename → fill)
├── SESSIONS.md             Session file generation + safety
├── config.ts               TypeScript config loader
├── requirements.txt        Python deps
└── package.json            Root deps
```

## How this repo was sanitized

Before going public, 93 commits were rewritten with `git filter-repo`. Every `.env`, `google.json`, `session.json`, OAuth token, OAuth client config, binary Telethon session journal, and PDF scrape report — across the entire history — was either replaced with a `YOUR_*` placeholder or deleted outright.

`git log` still tells the project's story. `git log -p` no longer leaks anyone's keys.

## Security notes

- **No live credentials in history.** Every secret was rewritten to `YOUR_*` placeholders at every commit.
- **Binary session journals + PDF scrape reports were deleted from history**, not just removed at HEAD.
- **`.gitignore` excludes** every sensitive pattern by default: `*.session`, `*.env`, `*_token.json`, `*.log`, scrape outputs.
- If you fork this repo, replace every example credential with your own. Do not ship the example values to production.
- For a leaked-secret incident response checklist, see [SESSIONS.md](SESSIONS.md#if-a-session-leaks).

## Recognition

- **Smart India Hackathon 2024 — Winner**, National Investigation Agency track
- Deployed by the **National Investigation Agency**, Government of India

## License

MIT — see [LICENSE](LICENSE).

## Author

Built by [Aayushman Singh](https://aayushman.dev) — engineer building autonomous coding agents, decentralized storage, and surveillance-grade software.

- Portfolio — [aayushman.dev](https://aayushman.dev)
- GitHub — [@aayushman-singh](https://github.com/aayushman-singh)
- X — [@aayushman2703](https://x.com/aayushman2703)
- LinkedIn — [in/aayushman-singh-zz](https://www.linkedin.com/in/aayushman-singh-zz/)
