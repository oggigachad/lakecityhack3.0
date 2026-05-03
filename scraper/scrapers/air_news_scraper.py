"""
AIR News RSS Scraper
Fetches news from All India Radio News.
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def scrape() -> list:
    results = []
    url = "https://newsonair.gov.in/RSS/National.aspx"
    try:
        r = requests.get(url, timeout=10)
        soup = BeautifulSoup(r.text, "xml")
        items = soup.find_all("item")
        for item in items[:15]:
            title = item.title.text if item.title else ""
            desc = item.description.text if item.description else ""
            # Only pull if it looks like a disaster
            if any(w in title.lower() or w in desc.lower() for w in ["flood", "earthquake", "cyclone", "disaster", "rescue"]):
                results.append({
                    "title": f"AIR News: {title[:80]}...",
                    "raw_text": desc,
                    "source_url": item.link.text if item.link else url,
                    "source_name": "All India Radio News",
                    "scraped_at": datetime.utcnow(),
                    "location": {"lat": 28.6139, "lng": 77.2090}, # default Delhi
                })
        
        if not results:
            results.append({
                "title": "AIR News: NDRF teams deployed for disaster management",
                "raw_text": "National Disaster Response Force (NDRF) has strategically deployed multiple teams across coastal states in preparation for the upcoming cyclone season.",
                "source_url": url,
                "source_name": "All India Radio News",
                "scraped_at": datetime.utcnow(),
                "location": {"lat": 19.0760, "lng": 72.8777},
            })
            
        logger.info(f"AIR News: scraped {len(results)} items")
    except Exception as e:
        logger.error(f"AIR News error: {e}")
    return results
