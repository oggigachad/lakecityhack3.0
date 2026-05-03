# VeriSignal — Crisis Incident Reporting & Management Platform
### Lakecity Hack 3.0 | Team VeriSignal

> AI-powered real-time crisis intelligence for India — backed by NDMA, IMD, NDRF & VeriAI (fine-tuned RoBERTa)

---

## Quick Start — Full Stack in 4 Terminals

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas URI)

---

### Terminal 1 — Backend (FastAPI)

```bash
cd verisignal/backend
pip install -r requirements.txt

# Copy and fill env
cp .env.example .env

# Seed admin account (run once)
python seed_admin.py

# Start API server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

---

### Terminal 2 — Scraper Pipeline (APScheduler)

```bash
cd verisignal/scraper
pip install -r requirements.txt

# Install Playwright browser for GDACS
playwright install chromium

# Start scheduler (runs every 5 minutes automatically)
python scheduler.py
```

---

### Terminal 3 — Frontend (React + Vite)

```bash
cd verisignal/frontend
npm install

# Copy and fill env (add your Google Maps API key)
cp .env.example .env

npm run dev
```

Frontend: http://localhost:5173

---

### Terminal 4 — VeriAI Test (optional)

```bash
cd verisignal
python -m veri_ai.pipeline
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@verisignal.gov.in | Admin@VeriSignal2024 |
| Citizen | Register at /register | — |
| Responder | Register at /register | — |

---

## MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `users` | Operator accounts with roles |
| `incidents` | All crisis incidents (user + scraped) |
| `scraped_feed` | Raw scraped items from all sources |
| `schemes` | NDMA + MP SDMA government schemes |
| `audit_logs` | Status change trail per incident |
| `scraper_meta` | Last run time + health per source |
| `scraper_logs` | Error logs per scraper run |

---

## Architecture

```
Browser (React + Vite)
    │  REST (Axios + JWT)         WebSocket (auto-reconnect + backoff)
    ▼                             ▼
FastAPI (uvicorn)  ◄────────────── /ws/incidents  /ws/alerts
    │                             ▲
    ├── /auth/*   (JWT + Google OAuth)    /internal/broadcast ◄──────────┐
    ├── /incidents/*  (CRUD + VeriAI)                                    │
    ├── /veri/analyze  (RoBERTa pipeline)              feed_to_db.py     │
    ├── /schemes/      (NDMA + MP SDMA)                    │             │
    └── /scraper/*     (status + feed)             scheduler.py ─────────┘
                                                 (APScheduler 5-min)
    MongoDB Atlas ◄────────────────────────────────────────────────────────
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | — | Create citizen/responder account |
| POST | /auth/login | — | JWT token |
| GET | /auth/google | — | Google OAuth redirect |
| GET | /auth/me | JWT | Current user profile |
| PATCH | /auth/me/settings | JWT | Update alert radius + notifications |
| GET | /incidents/ | JWT | List with filters |
| POST | /incidents/report | JWT | Submit + VeriAI tag |
| GET | /incidents/stats/summary | JWT | Severity/type distribution |
| GET | /incidents/{id} | JWT | Detail + audit trail |
| PATCH | /incidents/{id}/status | Responder+ | Update + audit log |
| POST | /veri/analyze | JWT | VeriAI text analysis |
| GET | /schemes/ | JWT | NDMA + MP SDMA schemes |
| GET | /scraper/status | Admin | Source health + last run |
| GET | /scraper/feed | JWT | Latest scraped items |
| WS | /ws/incidents | Optional JWT | Live incident broadcast |
| WS | /ws/alerts | Optional JWT | Role-based push alerts |

---

## VeriAI — Analysis Pipeline

Fine-tuned RoBERTa (WELFake) wrapped for crisis intelligence:

| Output | Method | Threshold |
|--------|--------|-----------|
| `is_verified` | confidence > 0.70 AND label == "real" | Binary |
| `severity` | keyword match → confidence | CRITICAL / MEDIUM / LOW |
| `crisis_type` | keyword scoring (primary) | flood/fire/cyclone/earthquake/conflict/medical/infrastructure |
| `sentiment` | keyword counting | negative / neutral / positive |
| `confidence` | softmax probability | 0.0 – 1.0 |

Severity thresholds (confidence fallback):
- `> 0.85` → **CRITICAL**
- `0.60 – 0.85` → **MEDIUM**
- `< 0.60` → **LOW**

---

## Scraper Sources

| Source | URL | Library |
|--------|-----|---------|
| NDMA India | ndma.gov.in | BeautifulSoup |
| NDRF India | ndrf.gov.in | BeautifulSoup |
| IMD India | mausam.imd.gov.in | BeautifulSoup |
| ReliefWeb | reliefweb.int (API) | requests |
| GDACS | gdacs.org | Playwright (async) |
| NDTV / TOI | ndtv.com / timesofindia.com | BeautifulSoup |
| MP SDMA | mpsdma.nic.in | BeautifulSoup |

---

## Deployment

### Frontend → Vercel
```bash
cd verisignal/frontend
# Set env vars in Vercel dashboard:
# VITE_API_URL, VITE_WS_URL, VITE_MAPS_KEY
vercel --prod
```

### Backend + Scraper → Render
```bash
# Uses render.yaml — push to GitHub, connect to Render
# Set env vars in Render dashboard (see .env.example)
```

---

## Research Papers

1. **"Twitter as a Lifeline"** — Imran et al., AAAI 2016 — Disaster NLP classification
2. **"RoBERTa: A Robustly Optimized BERT"** — Liu et al., 2019 — VeriAI foundation
3. **"CrisisNLP"** — Imran et al., 2016 — Crisis NLP benchmark
4. **"Fake News Detection"** — Shu et al., 2017 — VeriAI fake-report filtering
5. **"Web Scraping for Crisis Informatics"** — Purohit et al., 2018 — Scraper pipeline

---

*VeriSignal — Built for Lakecity Hack 3.0. Powered by India's crisis data.*
