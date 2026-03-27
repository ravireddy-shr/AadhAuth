@echo off
REM Start both backend and frontend services for Aadhaar RTC System
REM This script should be run from C:\Aadhar CSP directory

echo Starting Aadhaar RTC Ticket Eligibility Verification System...
echo.

REM Start Backend (Python Flask)
echo [1/2] Starting Backend (Flask on port 5000)...
start "Aadhaar RTC Backend" cmd /k cd backend ^& python app.py
timeout /t 3 /nobreak

REM Start Frontend (React)
echo [2/2] Starting Frontend (React on port 3000)...
start "Aadhaar RTC Frontend" cmd /k cd frontend ^& npm start

echo.
echo ========================================
echo Services are starting...
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo Keep these windows open while using the system.
echo Press Ctrl+C in each window to stop services.
