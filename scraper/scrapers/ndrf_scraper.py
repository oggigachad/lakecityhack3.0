"""
NDRF India scraper — ndrf.gov.in
Scrapes rescue operation updates and press releases.
Fix: ndrf.gov.in uses a self-signed cert — verify=False required.
"""
import requests
import urllib3
from bs4 import BeautifulSoup
from datetime import datetime
import logging

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

NDRF_URLS = [
    "https://ndrf.gov.in/press-release",
    "https://ndrf.gov.in/latest-updates",
    "https://ndrf.gov.in/en/content/press-release",
    "https://ndrf.gov.in/",
]
NDRF_BASE = "https://ndrf.gov.in"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriSignal/1.0"}
DEFAULT_LOC = {"lat": 28.5355, "lng": 77.3910}  # NDRF HQ, Greater Noida


def scrape() -> list:
    results = []
    try:
        for url in NDRF_URLS:
            try:
                # verify=False — ndrf.gov.in uses a self-signed certificate chain
                resp = requests.get(url, headers=HEADERS, timeout=12, verify=False)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "lxml")

                candidates = (
                    soup.select("div.views-row")
                    or soup.select("table tr")
                    or soup.select("li.views-row")
                    or soup.select("article")
                    or soup.select(".field-items p")
                    or soup.select("li")
                )

                for el in candidates[:20]:
                    text = el.get_text(separator=" ", strip=True)
                    if len(text) < 30:
                        continue
                    link_tag = el.find("a")
                    href = link_tag.get("href", "") if link_tag else ""
                    if href and not href.startswith("http"):
                        href = f"{NDRF_BASE}{href}"
                    results.append({
                        "title":       text[:120],
                        "raw_text":    text[:1000],
                        "source_url":  href or url,
                        "source_name": "NDRF India",
                        "scraped_at":  datetime.utcnow(),
                        "location":    DEFAULT_LOC,
                    })

                if results:
                    break

            except requests.RequestException as e:
                logger.warning(f"NDRF URL {url} failed: {e}")
                continue

        logger.info(f"NDRF: scraped {len(results)} items")
    except Exception as e:
        logger.error(f"NDRF scraper error: {e}")
    return results
