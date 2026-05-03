"""
USGS Earthquake API Scraper
Fetches latest earthquake data globally.
"""
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def scrape() -> list:
    results = []
    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
        features = data.get("features", [])
        
        for f in features:
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            mag = props.get("mag")
            if mag is not None and mag > 4.5:
                coords = geom.get("coordinates", [])
                if len(coords) >= 2:
                    lng, lat = coords[0], coords[1]
                    results.append({
                        "title": props.get("title", f"M {mag} Earthquake"),
                        "raw_text": f"USGS reported an earthquake of magnitude {mag} at {props.get('place')}. Time: {datetime.fromtimestamp(props.get('time', 0)/1000).isoformat()}",
                        "source_url": props.get("url", url),
                        "source_name": "USGS Earthquakes",
                        "scraped_at": datetime.utcnow(),
                        "location": {"lat": float(lat), "lng": float(lng)},
                    })
        logger.info(f"USGS: scraped {len(results)} items")
    except Exception as e:
        logger.error(f"USGS scraper error: {e}")
    return results
