"""
Ambee Natural Disasters API Scraper
Fetches latest weather and fire data using Ambee endpoints provided by the user.
"""
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

AMBEE_API_KEY = "1149bc12f548db74ad2d253f51aea61b7642d881f4602ab1151438d0e537b9ad"

def scrape() -> list:
    results = []
    headers = {
        "x-api-key": AMBEE_API_KEY,
        "Content-type": "application/json"
    }

    # 1. Weather
    try:
        w_url = "https://api.ambeedata.com/weather/latest/by-lat-lng?lat=12.9889055&lng=77.574044"
        resp = requests.get(w_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json().get("data", {})
            if data:
                summary = data.get("summary", "Extreme Weather Condition")
                temp = data.get("temperature", "Unknown")
                results.append({
                    "title": f"Ambee Weather Alert: {summary}",
                    "raw_text": f"Current weather monitoring indicates: {summary}. Temperature: {temp}°C, Humidity: {data.get('humidity')}%. Wind: {data.get('windSpeed')}m/s.",
                    "source_url": w_url,
                    "source_name": "Ambee API",
                    "scraped_at": datetime.utcnow(),
                    "location": {"lat": 12.9889055, "lng": 77.574044},
                })
    except Exception as e:
        logger.error(f"Ambee weather error: {e}")

    # 2. Fire
    try:
        f_url = "https://api.ambeedata.com/fire/latest/by-lat-lng?lat=36.2734752809624&lng=-106.7050318"
        resp = requests.get(f_url, headers=headers, timeout=10)
        if resp.status_code == 200:
            fires = resp.json().get("data", [])
            for f in fires[:3]:
                results.append({
                    "title": "Ambee Active Wildfire Detection",
                    "raw_text": f"Wildfire detected via Ambee. Confidence: {f.get('confidence', 'High')}, Intensity: {f.get('intensity', 'Severe')}.",
                    "source_url": f_url,
                    "source_name": "Ambee API",
                    "scraped_at": datetime.utcnow(),
                    "location": {"lat": float(f.get("lat", 36.273)), "lng": float(f.get("lng", -106.705))},
                })
    except Exception as e:
        logger.error(f"Ambee fire error: {e}")

    logger.info(f"Ambee API: scraped {len(results)} items")
    return results
