from datetime import datetime

def scrape():
    now = datetime.utcnow()
    return [
        {
            "is_scheme": True,
            "scheme_title": "State Disaster Response Fund (SDRF)",
            "title": "State Disaster Response Fund (SDRF)",
            "source_name": "MHA India",
            "source_url": "https://ndmindia.mha.gov.in",
            "raw_text": "Financial assistance for affected people. Used for Floods, Cyclones, Earthquakes.",
            "type": "Flood, Earthquake, Cyclone",
            "eligibility": "Residents of affected area",
            "benefits": "Financial assistance for affected people",
            "state": "National",
            "scraped_at": now
        },
        {
            "is_scheme": True,
            "scheme_title": "National Disaster Response Fund (NDRF)",
            "title": "National Disaster Response Fund (NDRF)",
            "source_name": "MHA India",
            "source_url": "https://ndmindia.mha.gov.in",
            "raw_text": "Central government emergency fund. Used in major disasters.",
            "type": "Major Disasters",
            "eligibility": "States facing severe calamities beyond coping capacity",
            "benefits": "Supplementary financial assistance for severe disasters",
            "state": "National",
            "scraped_at": now
        },
        {
            "is_scheme": True,
            "scheme_title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "source_name": "Ministry of Agriculture and Farmers Welfare",
            "source_url": "https://pmfby.gov.in",
            "raw_text": "Crop insurance scheme. Covers Flood damage, Drought, Natural disasters.",
            "type": "Flood, Drought, Natural Disasters",
            "eligibility": "Farmers growing notified crops in notified areas",
            "benefits": "Insurance cover and financial support for crop loss/damage",
            "state": "National",
            "scraped_at": now
        },
        {
            "is_scheme": True,
            "scheme_title": "Pradhan Mantri Awas Yojana (PMAY)",
            "title": "Pradhan Mantri Awas Yojana (PMAY)",
            "source_name": "Ministry of Rural Development",
            "source_url": "https://pmayg.nic.in",
            "raw_text": "Housing support. Can be used after house damage (flood, earthquake).",
            "type": "Flood, Earthquake",
            "eligibility": "Houseless or those living in kutcha houses",
            "benefits": "Financial assistance to build or repair damaged houses",
            "state": "National",
            "scraped_at": now
        },
        {
            "is_scheme": True,
            "scheme_title": "National Disaster Management Authority (NDMA) Guidelines",
            "title": "National Disaster Management Authority (NDMA) Guidelines",
            "source_name": "NDMA",
            "source_url": "https://ndma.gov.in",
            "raw_text": "National policies (NDMP), Relief guidelines, Compensation norms.",
            "type": "All Disasters",
            "eligibility": "All citizens affected by disasters",
            "benefits": "Relief and compensation norms per national guidelines",
            "state": "National",
            "scraped_at": now
        }
    ]

if __name__ == "__main__":
    for s in scrape():
        print(s)
