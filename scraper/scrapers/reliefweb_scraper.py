"""
ReliefWeb India scraper — reliefweb.int
Fix: v1/reports API returned 410 Gone.
     Using the correct v1/disasters + v1/reports endpoints with updated filters.
     Falls back to HTML scraping of the country page if API fails.
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "VeriSignal/1.0 (hackathon-crisis-platform; contact@verisignal.in)",
    "Accept": "application/json",
}
HTML_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriSignal/1.0",
}
DEFAULT_LOC = {"lat": 20.5937, "lng": 78.9629}

# ReliefWeb API v1 — correct endpoints
REPORTS_API    = "https://api.reliefweb.int/v1/reports"
DISASTERS_API  = "https://api.reliefweb.int/v1/disasters"
COUNTRY_PAGE   = "https://reliefweb.int/country/ind"


def _try_reports_api() -> list:
    """POST to /v1/reports filtered to India disasters."""
    payload = {
        "filter": {
            "operator": "AND",
            "conditions": [
                {"field": "primary_country.iso3", "value": "IND"},
            ],
        },
        "fields": {"include": ["title", "body-html", "url", "date", "source"]},
        "sort":  ["date.created:desc"],
        "limit": 10,
    }
    resp = requests.post(REPORTS_API, json=payload, headers=HEADERS, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("data", []):
        fields = item.get("fields", {})
        title  = fields.get("title", "")
        body   = fields.get("body-html", "") or fields.get("body", "")
        # Strip HTML tags from body
        body_text = BeautifulSoup(body, "lxml").get_text(separator=" ", strip=True)[:800] if body else ""
        url    = fields.get("url", COUNTRY_PAGE)
        full_text = f"{title}. {body_text}".strip()
        if full_text and len(full_text) > 20:
            results.append({
                "title":       title[:120],
                "raw_text":    full_text[:1000],
                "source_url":  url,
                "source_name": "ReliefWeb India",
                "scraped_at":  datetime.utcnow(),
                "location":    DEFAULT_LOC,
            })
    return results


def _try_disasters_api() -> list:
    """POST to /v1/disasters filtered to India — simpler payload."""
    payload = {
        "filter": {
            "field": "country.iso3",
            "value": "IND",
        },
        "fields": {"include": ["name", "description", "url", "date", "type"]},
        "sort":  ["date.event:desc"],
        "limit": 10,
    }
    resp = requests.post(DISASTERS_API, json=payload, headers=HEADERS, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("data", []):
        fields = item.get("fields", {})
        title  = fields.get("name", "")
        desc   = fields.get("description", "")
        url    = fields.get("url", COUNTRY_PAGE)
        full_text = f"{title}. {desc}".strip()
        if full_text and len(full_text) > 10:
            results.append({
                "title":       title[:120],
                "raw_text":    full_text[:1000],
                "source_url":  url,
                "source_name": "ReliefWeb India",
                "scraped_at":  datetime.utcnow(),
                "location":    DEFAULT_LOC,
            })
    return results


def _try_html_scrape() -> list:
    """Fallback: scrape the ReliefWeb India country page directly."""
    resp = requests.get(COUNTRY_PAGE, headers=HTML_HEADERS, timeout=12)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    results = []
    seen = set()
    # ReliefWeb uses article cards
    for sel in ["article h3 a", "h2 a", ".card--report a", "a[href*='/report/']"]:
        for a in soup.select(sel)[:20]:
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if not href.startswith("http"):
                href = f"https://reliefweb.int{href}"
            if len(text) > 20 and text not in seen:
                seen.add(text)
                results.append({
                    "title":       text[:120],
                    "raw_text":    text[:1000],
                    "source_url":  href,
                    "source_name": "ReliefWeb India",
                    "scraped_at":  datetime.utcnow(),
                    "location":    DEFAULT_LOC,
                })
    return results


def scrape() -> list:
    results = []

    # Strategy 1: reports API
    try:
        results = _try_reports_api()
        logger.info(f"ReliefWeb reports API: {len(results)} items")
        if results:
            return results
    except Exception as e:
        logger.warning(f"ReliefWeb reports API failed: {e}")

    # Strategy 2: disasters API
    try:
        results = _try_disasters_api()
        logger.info(f"ReliefWeb disasters API: {len(results)} items")
        if results:
            return results
    except Exception as e:
        logger.warning(f"ReliefWeb disasters API failed: {e}")

    # Strategy 3: HTML scrape fallback
    try:
        results = _try_html_scrape()
        logger.info(f"ReliefWeb HTML fallback: {len(results)} items")
    except Exception as e:
        logger.warning(f"ReliefWeb HTML scrape failed: {e}")

    logger.info(f"ReliefWeb total: {len(results)} items")
    return results
