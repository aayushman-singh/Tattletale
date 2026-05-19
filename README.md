# Tattletale

Social media feed parser built for investigators — automates capture, documentation, and OSINT enrichment across Instagram, Twitter/X, WhatsApp, Telegram, Facebook, Discord, Mastodon, YouTube, and Google Drive. **Smart India Hackathon '24 winner. Deployed by the National Investigation Agency (NIA), Government of India.**

[![License](https://img.shields.io/badge/License-MIT-c8693d?style=flat)](LICENSE) [![SIH '24](https://img.shields.io/badge/SIH%20'24-Winner-1f6feb?style=flat)](https://www.sih.gov.in/) [![Deployed](https://img.shields.io/badge/Deployed-NIA-3a8a5f?style=flat)](#recognition)

---

## Why

Manual evidence capture is slow and error-prone. Investigators spend hours screenshotting posts, transcribing handles, and chasing cross-platform identities by hand. Tattletale automates the loop — point it at a target, get a structured report with timeline, location signals, contact graph, and OSINT enrichment ready for case files.

This is the production fork. It is the same codebase that runs in the NIA deployment, published for educational purposes with all live credentials, sessions, and cookie jars rewritten to obvious `YOUR_*` placeholders across the entire git history.

## Status

| Aspect | State |
| --- | --- |
| Production deployment | Private NIA fork, hardened |
| Public repo | Educational reference — runnable with your own credentials |
| Credentials in history | Scrubbed to placeholders via `git filter-repo` |
| Live cookie sessions | Removed from history, replaced with `session.example.json` |
| Personal scrape outputs (PDFs) | Removed from history |

## Features

- **9-platform scraping** — Instagram, Twitter/X, WhatsApp, Telegram, Facebook, Discord, Mastodon, YouTube, Google Drive
- **OSINT integration** — Maigret enrichment across 2,500+ sites
- **Timeline + location capture** — geo + temporal tagging where the platform exposes it
- **Cross-identity correlation** — connect handles across platforms
- **Per-case report generation** — PDF + structured JSON outputs ready for chain of custody
- **Secure storage** — encrypted at rest, optional Google Drive upload
- **AI/ML analysis** — entity extraction, summarization, visualization
- **Multi-surface** — web dashboard, mobile app, standalone Windows scraper

## Flowchart

<img src="./Readme Section Flowchart.png" alt="Tattletale architecture flowchart"/>

## Stack

**Backend** — Node.js · Python 3.10.15 · Express · MongoDB · Mongoose · bcrypt · JWT
**Scraping** — TypeScript · Crawlee · Playwright · Telethon · Puppeteer
**Frontend** — React · Tailwind CSS
**Mobile** — Flutter · Dart
**OSINT** — Maigret integration
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

This repo ships with **example/shim files** showing the expected format. Copy, fill, rename:

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

## Security notes

- **No live credentials in history.** All `.env`, `google.json`, `session.json`, OAuth tokens, and OAuth client configs across every commit have been rewritten to `YOUR_*` placeholders.
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
