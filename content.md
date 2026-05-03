# TriNetra (formerly VeriSignal) - Project Viva Guide

This document is a comprehensive guide to understanding the project architecture, tech stack, configuration, and implementation details for your viva presentation.

## 1. Project Directory Structure

The project is structured as a full-stack monorepo with dedicated services:

```text
verisignal/ (TriNetra)
│
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Sidebar, etc.)
│   │   ├── pages/            # View pages (SchemesPage, NewsPage, Dashboard, etc.)
│   │   ├── index.css         # Global CSS with Tailwind themes and custom component classes
│   │   └── App.jsx           # Main React Router setup
│   ├── package.json          # Node.js dependencies
│   └── .env                  # Frontend environment variables (Maps API keys, backend URL)
│
├── backend/                  # FastAPI web server
│   ├── main.py               # Application entry point, WebSocket routes
│   ├── requirements.txt      # Python dependencies
│   ├── feed_to_db.py         # Pipeline script pushing parsed data to MongoDB
│   └── seed_admin.py         # Admin account initialization
│
├── scraper/                  # Automated intelligence data gathering
│   ├── scrapers/             # Individual scraper scripts (schemes_scraper.py, imd_scraper.py)
│   ├── scheduler.py          # APScheduler script running jobs every 1/5 minutes
│   └── requirements.txt      # Scraper dependencies (Playwright, bs4, requests)
│
└── veri_ai/                  # NLP Analysis Engine
    └── pipeline.py           # RoBERTa pipeline for confidence scoring and crisis analysis
```

---

## 2. Editing the UI (Colors, Buttons, etc.)

The project uses **Tailwind CSS v4** combined with custom CSS classes. All core design configurations live in a single file, making it very easy to edit.

**File to Edit:** `frontend/src/index.css`

### How to change Colors:
In `index.css`, look at the `@theme` block at the top. You can change hex codes here, and they will update across the entire platform.
```css
@theme {
    --color-navy: #0A1628;        /* Main Background */
    --color-alert: #C0392B;       /* Alert/Danger Red */
    --color-amber: #E67E22;       /* Warning Orange */
    --color-green: #27AE60;       /* Safe/Verified Green */
    /* Edit these hex values to change the color palette globally */
}
```

### How to change Button Sizes & Styles:
The buttons use custom utility classes defined in the `@layer components` block of `index.css`.
```css
@layer components {
  .btn-primary {
    @apply bg-steel hover:bg-steel-light text-white-muted px-4 py-2 text-sm font-medium transition-colors duration-150 border border-border cursor-pointer;
  }
}
```
* **To change size:** Modify `px-4 py-2 text-sm` to something larger like `px-6 py-3 text-lg`.
* **To change borders:** Adjust the `border` properties.

---

## 3. Scraping Architecture (How data is fetched)

The platform aggregates live crisis data automatically without manual intervention.

### Libraries Used for Scraping
* **BeautifulSoup4 (bs4):** Used for parsing static HTML from sites like NDMA, NDRF, IMD, and NDTV.
* **Requests:** Used for making HTTP requests to fetch pages and interact with public APIs (like the ReliefWeb API).
* **Playwright (async):** Used for scraping dynamic, JavaScript-rendered websites (like GDACS) that traditional requests cannot parse.

### Scraping Workflow
1. The **`scheduler.py`** script uses **APScheduler** to run the scraping pipeline automatically every 1 to 5 minutes.
2. Individual scrapers fetch data from specific sites (e.g., CWC Flood, ISRO Bhuvan, USGS Earthquake).
3. The data is passed through the `feed_to_db.py` pipeline.
4. If it's a social/news post, it gets evaluated by **VeriAI** for confidence scoring before hitting the database.

---

## 4. AI & Chatbot Models Used

We utilize a hybrid AI intelligence engine to process reports and provide an interactive chatbot.

### A. Incident Verification & Classification (VeriAI)
* **Model:** Fine-tuned **RoBERTa** (WELFake dataset foundation).
* **Why RoBERTa?:** BERT-based models are exceptional at Natural Language Processing (NLP) tasks. It helps accurately classify if a disaster report is *real* or *fake* by analyzing linguistic patterns.
* **Scikit-Learn:** Custom-trained scikit-learn models are used to boost sentiment and apply confidence scoring to news and tweet streams, helping filter out false-positives.

### B. Chatbot Interface
* **Model:** **Claude Sonnet 4.6 API** (Provided via KodeKloud).
* **Why Claude Sonnet 4.6?:** It offers state-of-the-art context retention, reasoning, and speed, making it the perfect Large Language Model (LLM) to power a crisis intelligence chatbot where accurate, fast information delivery is critical.

---

## 5. The Tech Stack & Why We Chose It

### Frontend
* **React.js & Vite:** React allows for reusable UI components. Vite is used instead of Create React App because its build times and Hot Module Replacement (HMR) are significantly faster.
* **Tailwind CSS v4:** For rapid, utility-first styling without leaving the HTML/JSX.
* **Framer Motion & GSAP:** To create high-end interactive animations (like the boot splash screen and landing page transitions) that give a modern, military/crisis-center aesthetic.
* **Leaflet / React-Leaflet:** Chosen for optimized, dark-themed geospatial visualization to plot incident map markers.

### Backend
* **FastAPI (Python):** 
  * *Why?* FastAPI is incredibly fast and supports asynchronous programming (`async/await`) out of the box. Since we are doing a lot of I/O bound tasks (database calls, web scraping, WebSockets), async support is vital. Also, since our AI pipeline and scrapers are in Python, keeping the backend in Python prevents language-barrier complexities.
* **WebSockets:** Used to push live incident broadcasts to the React frontend in real-time, meaning users don't need to refresh the page to see new crises.

### Database
* **MongoDB (Atlas):** 
  * *Why?* Scraped data from multiple different sources has unpredictable structures (some have coordinates, some have links, some have severity metrics). A NoSQL document database like MongoDB handles unstructured and dynamic JSON data perfectly. It also natively supports GeoJSON for plotting incident coordinates easily.

---

## 6. External APIs Used

1. **KodeKloud Claude Sonnet 4.6 API:** Powers the natural language conversational abilities of the VeriAI responder chatbot.
2. **ReliefWeb API:** Used directly in the backend scraper pipeline to pull international disaster reports.
3. **Google Maps API / Leaflet (OpenStreetMap):** Provides the map tiles and geocoding capabilities for the main incident tracking dashboard.

---

## 7. Common Viva Q&A Guide

**Q: How do you handle real-time updates on the frontend without the user refreshing?**
*A: We use WebSockets. When the background `scheduler.py` scrapes a new incident, it pushes it to the MongoDB database and triggers a FastAPI WebSocket broadcast (`/ws/incidents`). The React frontend listens to this connection and immediately updates the UI state.*

**Q: Why use Playwright for scraping when BeautifulSoup is faster?**
*A: BeautifulSoup only downloads the raw HTML sent by the server. Many modern sites (like GDACS) are Single Page Applications where data is loaded via JavaScript *after* the page loads. Playwright launches an actual headless Chromium browser to execute the JavaScript, allowing us to scrape the fully rendered data.*

**Q: How does the platform differentiate between a real crisis tweet and a fake news post?**
*A: Raw text is passed through our VeriAI pipeline. We use a hybrid classification system. First, a rule-based sanity filter checks for obvious noise. Then, our fine-tuned RoBERTa model analyzes the semantic context, and a Scikit-Learn model scores the sentiment to generate a final confidence probability (0.0 - 1.0). If confidence > 0.70, it is marked verified.*

**Q: Why didn't you use SQL (like PostgreSQL or MySQL)?**
*A: Because our data ingestion pipeline relies on web scraping 7+ different sources. For instance, an IMD weather report has different fields than a USGS earthquake report. Enforcing a strict schema in a SQL database would be highly restrictive. MongoDB allows us to store these varying JSON documents flexibly.*

---

## 8. System Architecture (High-Level Overview)

The TriNetra architecture follows a highly decoupled, microservices-inspired pattern consisting of three core pillars:
1. **Data Ingestion Engine (Scrapers + AI):** A set of Python scrapers running on a scheduler (APScheduler/Bash Scripts) constantly pull data from various sources (government sites, news). This raw text is immediately piped into the **VeriAI** pipeline (RoBERTa + Scikit-Learn) to be classified, fact-checked, and scored for severity.
2. **Centralized Backend (FastAPI + MongoDB):** The validated data is stored in MongoDB Atlas. FastAPI acts as the central router, handling REST requests (like fetching historical data or user auth) and maintaining WebSocket connections.
3. **Real-time Client (React):** The frontend connects to the FastAPI WebSockets to listen for incoming, verified disasters. This ensures zero latency between the moment an incident is verified by our AI and when it appears on the responder's map dashboard.

---

## 9. Importance of Our Platform (Why TriNetra?)

In India, crisis management suffers from severe data fragmentation. 
- The IMD tracks weather.
- The CWC tracks floods.
- Social media holds localized, hyper-fast ground reports, but is full of fake news.

**TriNetra solves this by acting as a Unified Intelligence Platform.** It aggregates all these siloed sources into one dashboard, filtering out the noise using AI, and giving First Responders (NDRF, SDMA) a single, reliable source of truth. Time saved in verifying a crisis directly translates to lives saved.

---

## 10. Competition & Our Unique Value Proposition (What makes us unique?)

**Existing Solutions / Competition:**
* Traditional news channels (Too slow, lacks actionable coordinate data).
* Government portal dashboards (Often siloed to one disaster type, e.g., only earthquakes, lacking real-time citizen input).
* Standard Twitter/X feeds (Filled with misinformation, panic, and unrelated political noise).

**Our Unique Value Proposition (UVP):**
1. **Hybrid AI Verification (VeriAI):** We don't just display social media feeds; we actively fact-check them using a fine-tuned RoBERTa model to drop false positives, ensuring responders don't waste resources on fake alerts.
2. **Automated Cross-Referencing:** If a disaster is reported, our scraper simultaneously pulls data from official sources (USGS/NDMA) to cross-verify the incident context.
3. **Sub-Minute Latency:** Our optimized scraper loops + WebSocket broadcast means responders see verified data almost instantly, compared to waiting for a manual centralized government report.

---

## 11. Future Improvements

If asked "What would you do with more time?", you can mention these points:
1. **Drone Integration API:** Exposing an endpoint so autonomous drones can feed live video streams directly into the incident dashboard.
2. **Multilingual AI Analysis:** Currently, our VeriAI model works best in English/Hindi. We plan to integrate models that can classify and translate regional languages (Marathi, Bengali, Tamil) for deeper rural penetration.
3. **Predictive Analytics:** Moving from *Reactive* to *Proactive*. Using historical MongoDB data to train machine learning models that predict flood or landslide risks *before* they happen based on weather patterns.
4. **Mobile App Offline Support:** Releasing a native application for offline-first support for citizens stuck in zero-network crisis zones using Bluetooth mesh networks.

---

## 12. Important Things to Keep in Mind During the Viva

* **Own the AI Logic:** Be ready to explain that you aren't just using a basic ChatGPT prompt for data verification. You are using a specialized NLP pipeline (RoBERTa for context + Scikit-Learn for sentiment/confidence).
* **Defend Your Stack:** They might ask why you used React instead of simple HTML/JS. Explain that a dashboard with real-time WebSockets, dynamic mapping (Leaflet), and complex state management requires a robust framework like React.
* **Highlight the Real-World Impact:** Always pivot the conversation back to *how* this helps. Technical jargon is good, but reminding the judges that "this platform reduces emergency response time by aggregating scattered data" is the winning argument.
