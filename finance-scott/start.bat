@echo off
title Finance App
color 0A

echo.
echo  ================================================
echo   Finance App - Starting up...
echo  ================================================
echo.

:: ── Check Python ──────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found.
    echo  Please install Python from https://python.org
    echo  Make sure to check "Add Python to PATH" during install.
    pause
    exit /b
)

:: ── Go to backend folder ──────────────────────────
cd /d "%~dp0backend"

:: ── First run: install requirements ───────────────
if not exist ".installed" (
    echo  [1/3] First run detected - installing dependencies...
    echo        This will take a few minutes, only happens once.
    echo.
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo  [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
    echo installed > .installed
    echo  [1/3] Done.
    echo.
) else (
    echo  [1/3] Dependencies already installed.
)

:: ── Check if model files exist ────────────────────
if not exist "models\tfidf_pipeline.pkl" (
    echo.
    echo  [WARNING] Model file not found at backend\models\tfidf_pipeline.pkl
    echo  The app will still work but auto-classification will be disabled.
    echo  Unzip your income_classifier_export.zip into backend\models\
    echo.
    timeout /t 3 >nul
)

:: ── Start Flask backend ───────────────────────────
echo  [2/3] Starting backend server...
start /min cmd /c "python app.py"

:: ── Wait for Flask to be ready ────────────────────
echo  [3/3] Waiting for server to be ready...
:wait_loop
timeout /t 1 >nul
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 goto wait_loop
echo  [3/3] Server is ready.
echo.

:: ── Open the app ──────────────────────────────────
echo  Opening Finance App in your browser...
start "" "%~dp0frontend\finance.html"

echo.
echo  ================================================
echo   App is running!
echo   Backend : http://localhost:5000
echo   
echo   Keep this window open while using the app.
echo   Press Ctrl+C or close this window to stop.
echo  ================================================
echo.

:: ── Keep alive + cleanup on exit ─────────────────
:keep_alive
timeout /t 5 >nul
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo  Backend stopped unexpectedly. Restarting...
    start /min cmd /c "python app.py"
)
goto keep_alive
