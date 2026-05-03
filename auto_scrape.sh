#!/bin/bash
# Check if backend is running, if so, run scraper every 1 minute.

cd "$(dirname "$0")"

while true; do
  if curl -s http://localhost:8000/scraper/status > /dev/null; then
    echo "$(date): Backend is running. Running scraper pipeline..."
    python scrape_now.py
  else
    echo "$(date): Backend is not reachable at http://localhost:8000, skipping scrape."
  fi
  echo "Waiting 60 seconds..."
  sleep 60
done
