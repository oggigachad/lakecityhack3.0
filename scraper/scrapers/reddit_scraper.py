"""
Reddit Scraper
Fetches latest posts related to disasters from r/india using Reddit's public JSON API.
"""
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

REDDIT_URL = "https://www.reddit.com/r/india/search.json"
PARAMS = {
    "q": "flood OR earthquake OR cyclone OR landslide OR disaster",
    "restrict_sr": "1",
    "sort": "new",
    "limit": "15"
}

# Reddit requires a custom User-Agent to prevent 429 Too Many Requests
HEADERS = {
    "User-Agent": "windows:verisignal.crisis.app:v1.0 (by /u/verisignal)"
}

DEFAULT_LOC = {"lat": 20.5937, "lng": 78.9629}

def scrape() -> list:
    results = []
    try:
        resp = requests.get(REDDIT_URL, params=PARAMS, headers=HEADERS, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        
        posts = data.get("data", {}).get("children", [])
        
        for post in posts:
            post_data = post.get("data", {})
            title = post_data.get("title", "")
            selftext = post_data.get("selftext", "")
            url = f"https://www.reddit.com{post_data.get('permalink', '')}"
            
            full_text = f"{title}. {selftext}".strip()
            
            if len(full_text) > 15:
                results.append({
                    "title": title[:120],
                    "raw_text": full_text[:1000],
                    "source_url": url,
                    "source_name": "Reddit",
                    "scraped_at": datetime.utcnow(),
                    "location": DEFAULT_LOC,
                })
                
        logger.info(f"Reddit: scraped {len(results)} items")
    except Exception as e:
        logger.error(f"Reddit scraper error: {e}")
        
    return results
