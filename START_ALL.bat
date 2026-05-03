@echo off
title TriNetra — Full Stack Launcher
color 0B
echo.
echo  =====================================================
echo   TRINETRA — Full Stack Launcher
echo   Starting: Backend + Frontend + Scraper Scheduler
echo  =====================================================
echo.

set ROOT=%~dp0

REM --- 1. Start FastAPI Backend ---
echo  [1/3] Starting FastAPI Backend on :8000 ...
start "TriNetra Backend" cmd /k "cd /d %ROOT%verisignal\backend && python -m uvicorn main:app --reload --port 8000"
timeout /t 2 /nobreak > nul

REM --- 2. Start React Frontend ---
echo  [2/3] Starting React Frontend on :5173 ...
start "TriNetra Frontend" cmd /k "cd /d %ROOT%verisignal\frontend && npm run dev"
timeout /t 2 /nobreak > nul

REM --- 3. Start Scraper Scheduler (every 1 minute) ---
echo  [3/3] Starting Scraper Scheduler (every 1 minute) ...
start "TriNetra Scraper" cmd /k "cd /d %ROOT%verisignal\scraper && python scheduler.py"

echo.
echo  =====================================================
echo   All 3 services started in separate windows!
echo.
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo   Scraper  : Running every 1 minute
echo  =====================================================
echo.
echo  To scrape immediately (on demand), run:
echo    python scrape_now.py
echo.
echo  Press any key to open the browser...
pause > nul
start http://localhost:5173
