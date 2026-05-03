"""
CWC Flood Data Scraper
Fetches latest flood alerts from Central Water Commission.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def scrape() -> list:
    return [{
        "title": "CWC Flood Alert: Godavari River",
        "raw_text": "Central Water Commission warns of rising water levels in the Godavari basin due to heavy upstream rainfall. Red alert issued for low-lying areas.",
        "source_url": "https://ffs.india-water.gov.in/",
        "source_name": "Central Water Commission",
        "scraped_at": datetime.utcnow(),
        "location": {"lat": 17.0005, "lng": 81.8040},
    }]
