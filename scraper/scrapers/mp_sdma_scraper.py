"""
MP SDMA scraper — mpsdma.nic.in / mpsdma.mp.gov.in
Madhya Pradesh State Disaster Management Authority alerts and schemes.

Fixes:
  - Added HTTPS URLs alongside HTTP
  - Added hardcoded fallback schemes so the Schemes page is never empty
  - is_scheme=True items are routed to 'schemes' collection by feed_to_db
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import logging
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

MP_SOURCES = [
    ("https://mpsdma.mp.gov.in/",            "MP SDMA Gov"),
    ("http://mpsdma.nic.in/",                "MP SDMA"),
    ("http://mpsdma.nic.in/newsdetail.aspx", "MP SDMA News"),
]
MP_BASE_LOC = {"lat": 23.2599, "lng": 77.4126}  # Bhopal

HEADERS = {"User-Agent": "Mozilla/5.0 VeriSignal/1.0"}
CRISIS_KWS = [
    "बाढ़", "flood", "भूकंप", "earthquake", "आपदा", "disaster",
    "rescue", "alert", "warning", "relief", "cyclone", "fire",
    "landslide", "drought", "राहत", "बचाव",
]

# ── Hardcoded fallback schemes (always included) ───────────────────────────────
# These are real NDMA / MP SDMA schemes — shown if live scrape fails.
FALLBACK_SCHEMES = [
    {
        "scheme_title": "SDRF – State Disaster Response Fund",
        "raw_text": (
            "State Disaster Response Fund (SDRF) provides financial assistance "
            "to disaster-affected families in Madhya Pradesh for immediate relief "
            "including food, clothing, shelter, and medical aid."
        ),
        "source_url": "https://mpsdma.mp.gov.in/",
        "source_name": "MP SDMA Scheme",
        "state": "Madhya Pradesh",
        "category": "disaster relief",
    },
    {
        "scheme_title": "Mukhyamantri Sahayta Kosh – CM Relief Fund",
        "raw_text": (
            "The Chief Minister Relief Fund provides immediate financial assistance "
            "to victims of natural calamities such as floods, cyclones, droughts and "
            "earthquakes in Madhya Pradesh."
        ),
        "source_url": "https://mpsdma.mp.gov.in/",
        "source_name": "MP SDMA Scheme",
        "state": "Madhya Pradesh",
        "category": "disaster relief",
    },
    {
        "scheme_title": "NDMA – Flood Management Programme",
        "raw_text": (
            "National Disaster Management Authority's Flood Management Programme "
            "funds structural measures (embankments, drainage) and non-structural measures "
            "(flood forecasting, early warning) to mitigate flood impact across India."
        ),
        "source_url": "https://ndma.gov.in/",
        "source_name": "NDMA Scheme",
        "state": "National",
        "category": "flood",
    },
    {
        "scheme_title": "PM Fasal Bima Yojana – Crop Insurance",
        "raw_text": (
            "Pradhan Mantri Fasal Bima Yojana provides financial support to farmers "
            "suffering crop losses/damages due to unforeseen natural calamities — floods, "
            "drought, cyclone, hailstorm, landslides, and pest/disease attacks."
        ),
        "source_url": "https://pmfby.gov.in/",
        "source_name": "NDMA Scheme",
        "state": "National",
        "category": "drought",
    },
    {
        "scheme_title": "NDMA – National Cyclone Risk Mitigation Project",
        "raw_text": (
            "NCRMP strengthens cyclone-risk mitigation infrastructure including "
            "multi-purpose cyclone shelters, road connectivity to shelters, "
            "and early warning dissemination systems along India's coastline."
        ),
        "source_url": "https://ndma.gov.in/",
        "source_name": "NDMA Scheme",
        "state": "National",
        "category": "cyclone",
    },
    {
        "scheme_title": "ASDMA – Assam Disaster Management Compensation Scheme",
        "raw_text": (
            "Assam State Disaster Management Authority provides compensation to "
            "flood-affected families including ex-gratia for loss of life, "
            "house damage, crop damage, and livestock loss."
        ),
        "source_url": "https://asdma.assam.gov.in/",
        "source_name": "ASDMA Scheme",
        "state": "Assam",
        "category": "flood",
    },
    {
        "scheme_title": "Kerala Rebuild – Post-Disaster Reconstruction Scheme",
        "raw_text": (
            "Kerala Rebuild scheme funds reconstruction of flood-damaged houses, "
            "infrastructure, and livelihoods. Provides interest-free loans and "
            "grants to families whose homes were destroyed or damaged in the 2018 floods."
        ),
        "source_url": "https://rebuild.kerala.gov.in/",
        "source_name": "Kerala SDMA Scheme",
        "state": "Kerala",
        "category": "flood",
    },
    {
        "scheme_title": "Odisha Disaster Recovery Scheme",
        "raw_text": (
            "Odisha State Disaster Management Authority provides relief assistance "
            "for cyclone, flood, and drought-affected families including house repair "
            "grants, crop damage compensation, and restoration of community assets."
        ),
        "source_url": "https://odishadisaster.gov.in/",
        "source_name": "Odisha SDMA Scheme",
        "state": "Odisha",
        "category": "cyclone",
    },
]


def _build_fallback_items() -> list:
    """Return hardcoded scheme items tagged for the schemes collection."""
    now = datetime.utcnow()
    items = []
    for s in FALLBACK_SCHEMES:
        items.append({
            "title":        s["scheme_title"][:120],
            "scheme_title": s["scheme_title"][:120],
            "raw_text":     s["raw_text"][:1000],
            "source_url":   s["source_url"],
            "source_name":  s["source_name"],
            "scraped_at":   now,
            "location":     MP_BASE_LOC,
            "state":        s.get("state", "National"),
            "category":     s.get("category", "disaster relief"),
            "is_scheme":    True,
        })
    return items


def scrape() -> list:
    results = []

    # ── Try live scrape ────────────────────────────────────────────────────────
    for url, src_name in MP_SOURCES:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10, verify=False)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "lxml")

            candidates = (
                soup.select("div.news-content a")
                or soup.select("table td a")
                or soup.select("ul li a")
                or soup.select(".content a")
                or soup.select("a")
            )

            for a in candidates[:25]:
                text = a.get_text(strip=True)
                href = a.get("href", "")
                if href and not href.startswith("http"):
                    href = f"http://mpsdma.nic.in/{href.lstrip('/')}"

                if len(text) > 15 and any(kw in text for kw in CRISIS_KWS):
                    results.append({
                        "title":       text[:120],
                        "raw_text":    text[:1000],
                        "source_url":  href or url,
                        "source_name": src_name,
                        "scraped_at":  datetime.utcnow(),
                        "location":    MP_BASE_LOC,
                        "state":       "Madhya Pradesh",
                    })

            logger.info(f"MP SDMA ({src_name}): {len(results)} alert items so far")
            if results:
                break

        except requests.RequestException as e:
            logger.warning(f"MP SDMA {url} request failed: {e}")
        except Exception as e:
            logger.error(f"MP SDMA scraper error ({url}): {e}")

    # ── Try live schemes page ──────────────────────────────────────────────────
    live_schemes = 0
    for schemes_url in [
        "https://mpsdma.mp.gov.in/schemes",
        "http://mpsdma.nic.in/schemes.aspx",
    ]:
        try:
            resp = requests.get(schemes_url, headers=HEADERS, timeout=10, verify=False)
            soup = BeautifulSoup(resp.text, "lxml")
            rows = soup.select("table tr")[1:15]
            for row in rows:
                cols = row.find_all("td")
                if len(cols) < 1:
                    continue
                title = cols[0].get_text(strip=True)
                desc  = cols[1].get_text(strip=True) if len(cols) > 1 else ""
                link_tag = row.find("a")
                link = link_tag.get("href", "") if link_tag else ""
                if link and not link.startswith("http"):
                    link = f"http://mpsdma.nic.in/{link.lstrip('/')}"
                if title and len(title) > 5:
                    results.append({
                        "title":        title[:120],
                        "scheme_title": title[:120],
                        "raw_text":     f"{title}. {desc}"[:1000],
                        "source_url":   link or schemes_url,
                        "source_name":  "MP SDMA Scheme",
                        "scraped_at":   datetime.utcnow(),
                        "location":     MP_BASE_LOC,
                        "state":        "Madhya Pradesh",
                        "is_scheme":    True,
                    })
                    live_schemes += 1
            if live_schemes > 0:
                logger.info(f"MP SDMA live schemes: {live_schemes} items from {schemes_url}")
                break
        except Exception as e:
            logger.warning(f"MP SDMA schemes page error ({schemes_url}): {e}")

    # ── Always include fallback schemes ───────────────────────────────────────
    # feed_to_db de-duplicates by fingerprint, so these only insert once.
    fallbacks = _build_fallback_items()
    results.extend(fallbacks)
    logger.info(f"MP SDMA: +{len(fallbacks)} fallback scheme items appended")

    logger.info(f"MP SDMA total: {len(results)} items ({live_schemes} live schemes + {len(fallbacks)} fallback)")
    return results
