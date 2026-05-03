"""
IMD India scraper — imd.gov.in
Scrapes weather warnings, cyclone alerts, and flood advisories.
Fix: Old mausam.imd.gov.in/responsive/* URLs returned 404.
     Updated to current working IMD endpoints.
"""
import requests
import urllib3
from bs4 import BeautifulSoup
from datetime import datetime
import logging

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

# Updated working IMD URLs (verified April 2026)
IMD_SOURCES = [
    (
        "https://mausam.imd.gov.in/imd_latest/contents/warning_criteria.php",
        "IMD Weather Warning",
        {"lat": 28.6448, "lng": 77.2167},
    ),
    (
        "https://mausam.imd.gov.in/",
        "IMD Mausam Portal",
        {"lat": 20.5937, "lng": 78.9629},
    ),
    (
        "https://imd.gov.in/en/section/nhac/dynpdf/warning.pdf",
        "IMD Warning PDF",
        {"lat": 20.5937, "lng": 78.9629},
    ),
    (
        "https://rsmcnewdelhi.imd.gov.in/",
        "IMD RSMC Cyclone Warning",
        {"lat": 13.0827, "lng": 80.2707},
    ),
    (
        "https://imd.gov.in/en/weatherwarning.php",
        "IMD All-India Alert",
        {"lat": 20.5937, "lng": 78.9629},
    ),
]

ALERT_KWS = [
    "warning", "alert", "watch", "rain", "cyclone", "flood",
    "thunder", "heatwave", "fog", "storm", "advisory", "heavy",
    "yellow", "orange", "red", "caution",
]

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriSignal/1.0"}


def scrape() -> list:
    results = []
    for url, source_label, default_loc in IMD_SOURCES:
        try:
            # Skip binary PDF URLs
            if url.endswith(".pdf"):
                continue

            resp = requests.get(url, headers=HEADERS, timeout=12, verify=False)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            candidates = (
                soup.select("div.warning")
                or soup.select("div.alert")
                or soup.select("table td")
                or soup.select("p")
                or soup.select("li")
                or soup.select("div")
            )

            seen = set()
            found = 0
            for el in candidates[:30]:
                text = el.get_text(separator=" ", strip=True)
                if len(text) < 40 or text in seen:
                    continue
                seen.add(text)

                if not any(kw in text.lower() for kw in ALERT_KWS):
                    continue

                results.append({
                    "title":       text[:120],
                    "raw_text":    text[:1000],
                    "source_url":  url,
                    "source_name": source_label,
                    "scraped_at":  datetime.utcnow(),
                    "location":    default_loc,
                })
                found += 1

            logger.info(f"IMD ({source_label}): {found} items")
            if found > 0:
                break  # Stop at first successful source

        except requests.RequestException as e:
            logger.warning(f"IMD URL {url} failed: {e}")
        except Exception as e:
            logger.error(f"IMD scraper error ({url}): {e}")

    logger.info(f"IMD total: {len(results)} items")
    return results
