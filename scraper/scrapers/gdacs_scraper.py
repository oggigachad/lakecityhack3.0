"""
GDACS India scraper — gdacs.org
Uses async Playwright (JS-rendered page) via asyncio.run().
"""
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

GDACS_URL = "https://www.gdacs.org/Alerts/default.aspx"
INDIA_KEYWORDS = [
    "India", "IND", "Bay of Bengal", "Arabian Sea",
    "Cyclone", "Flood", "Earthquake", "Bangladesh", "Sri Lanka",
]


async def _scrape_async() -> list:
    """Async Playwright scrape. Returns list of dicts."""
    results = []
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) VeriSignal/1.0"
        )
        page = await context.new_page()
        try:
            await page.goto(GDACS_URL, timeout=30000, wait_until="networkidle")
            await page.wait_for_selector("table tr", timeout=12000)
            rows = await page.query_selector_all("table tr")

            for row in rows[1:20]:  # skip header row
                try:
                    text = await row.inner_text()
                    text = text.strip().replace("\t", " ").replace("\n", " ")

                    # Extract first absolute link
                    links = await row.query_selector_all("a")
                    link = GDACS_URL
                    for a in links:
                        href = await a.get_attribute("href") or ""
                        if href.startswith("http"):
                            link = href
                            break

                    # Only keep India/South-Asia relevant rows
                    if len(text) > 10 and any(kw in text for kw in INDIA_KEYWORDS):
                        results.append({
                            "title": text[:120],
                            "raw_text": text[:1000],
                            "source_url": link,
                            "source_name": "GDACS",
                            "scraped_at": datetime.utcnow(),
                            "location": {"lat": 20.5937, "lng": 78.9629},
                        })
                except Exception as row_err:
                    logger.debug(f"GDACS row parse error: {row_err}")
        finally:
            await browser.close()
    return results


def scrape() -> list:
    """Sync entry point — wraps async scraper. Never crashes the pipeline."""
    results = []
    try:
        results = asyncio.run(_scrape_async())
        logger.info(f"GDACS: scraped {len(results)} India-relevant items")
    except ImportError:
        logger.warning("playwright not installed — GDACS scraper skipped. Run: pip install playwright && playwright install chromium")
    except Exception as e:
        logger.error(f"GDACS scraper error: {e}")
    return results
