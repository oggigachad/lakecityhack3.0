"""
News scraper — NDTV Disaster section + Times of India India news
Crisis-keyword filtered headlines.
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

SOURCES = [
    {
        "name": "NDTV India",
        "urls": [
            "https://www.ndtv.com/topic/natural-disaster",
            "https://www.ndtv.com/india",
        ],
        "selectors": ["h2 a", "h3 a", ".story__title a", "article a", ".news-list a"],
        "base": "https://www.ndtv.com",
        "loc": {"lat": 28.6139, "lng": 77.2090},
    },
    {
        "name": "Times of India",
        "urls": [
            "https://timesofindia.indiatimes.com/topic/natural-disaster",
            "https://timesofindia.indiatimes.com/india",
        ],
        "selectors": ["a[data-articlelinktype]", "h3 a", "h2 a", "a.VeCXM"],
        "base": "https://timesofindia.indiatimes.com",
        "loc": {"lat": 19.0760, "lng": 72.8777},
    },
]

CRISIS_KWS = [
    "flood", "fire", "cyclone", "earthquake", "landslide", "disaster",
    "rescue", "NDRF", "SDRF", "alert", "emergency", "dead", "killed",
    "accident", "blast", "storm", "drought", "epidemic", "warning",
    "evacuate", "collapse", "tragedy", "victims", "casualty",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 VeriSignal/1.0",
    "Accept-Language": "en-US,en;q=0.9",
}


def scrape() -> list:
    results = []
    for src in SOURCES:
        src_results = []
        for url in src["urls"]:
            try:
                resp = requests.get(url, headers=HEADERS, timeout=10)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "lxml")

                seen = set()
                for sel in src["selectors"]:
                    for a in soup.select(sel)[:40]:
                        text = a.get_text(strip=True)
                        href = a.get("href", "")
                        if not href.startswith("http"):
                            href = f"{src['base']}{href}" if href.startswith("/") else url

                        if len(text) > 20 and text not in seen:
                            if any(kw.lower() in text.lower() for kw in CRISIS_KWS):
                                seen.add(text)
                                src_results.append({
                                    "title": text[:120],
                                    "raw_text": text[:1000],
                                    "source_url": href,
                                    "source_name": src["name"],
                                    "scraped_at": datetime.utcnow(),
                                    "location": src["loc"],
                                })

                if src_results:
                    break  # Stop at first successful URL per source

            except requests.RequestException as e:
                logger.warning(f"News scraper {src['name']} ({url}) request failed: {e}")
            except Exception as e:
                logger.error(f"News scraper {src['name']} error: {e}")

        results.extend(src_results[:15])  # Max 15 per source per cycle
        logger.info(f"News ({src['name']}): {len(src_results)} items")

    logger.info(f"News total: {len(results)} items")
    return results
