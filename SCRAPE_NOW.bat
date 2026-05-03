@echo off
title TriNetra — Scrape Now (All 14 Sources)
color 0A
echo.
echo  =====================================================
echo   TRINETRA — Running All Scrapers NOW
echo   This will fetch from all 14 sources and push to DB
echo  =====================================================
echo.
cd /d "%~dp0"
python scrape_now.py
echo.
echo  =====================================================
echo   Scrape complete. Press any key to close.
echo  =====================================================
pause > nul
