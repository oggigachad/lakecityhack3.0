"""
NDMA India scraper — ndma.gov.in
Scrapes official disaster alerts and scheme updates.
Every scraper MUST: timeout=10, try/except, return list with title/source_url/location/raw_text/scraped_at
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

NDMA_URLS = [
    "https://ndma.gov.in/Natural-Hazards/Disasters-Alerts",
    "https://ndma.gov.in/Media-Communication/Press-Releases",
    "https://ndma.gov.in/",
]
NDMA_BASE = "https://ndma.gov.in"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriSignal/1.0 Crisis-Scraper"}
DEFAULT_LOC = {"lat": 28.6139, "lng": 77.2090}  # New Delhi (NDMA HQ)


def scrape() -> list:
    results = []
    try:
        for url in NDMA_URLS:
            try:
                resp = requests.get(url, headers=HEADERS, timeout=10)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "lxml")

                # Try multiple selectors in priority order
                candidates = (
                    soup.select("div.views-row")
                    or soup.select("article")
                    or soup.select("li.views-row")
                    or soup.select("div.news-item")
                    or soup.select("div.field-item")
                    or soup.select("p")
                )

                for el in candidates[:15]:
                    text = el.get_text(separator=" ", strip=True)
                    if len(text) < 30:
                        continue
                    link_tag = el.find("a")
                    href = link_tag.get("href", "") if link_tag else ""
                    if href and not href.startswith("http"):
                        href = f"{NDMA_BASE}{href}"
                    results.append({
                        "title": text[:120],
                        "raw_text": text[:1000],
                        "source_url": href or url,
                        "source_name": "NDMA India",
                        "scraped_at": datetime.utcnow(),
                        "location": DEFAULT_LOC,
                    })

                if results:
                    break  # Stop at first successful URL

            except requests.RequestException as e:
                logger.warning(f"NDMA URL {url} failed: {e}")
                continue

        logger.info(f"NDMA: scraped {len(results)} items")
    except Exception as e:
        logger.error(f"NDMA scraper error: {e}")
    return results
