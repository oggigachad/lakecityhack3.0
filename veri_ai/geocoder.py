"""
Claude Haiku Geocoder
Uses KodeKloud AI API to extract coordinates from text.
"""
from openai import OpenAI
import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key="sk-9-GlN_uS0ogQ5MooJwkOew",
    base_url="https://api.ai.kodekloud.com/v1"
)

def extract_coordinates(text: str) -> Dict[str, float]:
    """Uses Claude Haiku to extract coordinates from text."""
    try:
        prompt = f"""Extract the latitude and longitude from the following disaster report. If a city or region is mentioned, provide its approximate coordinates. Respond ONLY with a valid JSON object in this exact format: {{"lat": 12.34, "lng": 56.78}}. If no location is mentioned, return {{"lat": 20.5937, "lng": 78.9629}}. Text: {text}"""
        response = client.chat.completions.create(
            model="claude-haiku-4-5-20251001",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        content = response.choices[0].message.content.strip()
        if "{" in content and "}" in content:
            content = content[content.find("{"):content.find("}")+1]
            return json.loads(content)
        return {"lat": 20.5937, "lng": 78.9629}
    except Exception as e:
        logger.error(f"Claude Geocoding failed: {e}")
        return {"lat": 20.5937, "lng": 78.9629}
