@echo off
setlocal
chcp 65001 > nul

set "PROJECT_DIR=C:\Users\cocac\Lottery Resale Tracker"
set "LOG_DIR=%PROJECT_DIR%\logs"
set "LOG_FILE=%LOG_DIR%\operate.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo ==================================================>> "%LOG_FILE%"
echo [%DATE% %TIME%] operate start>> "%LOG_FILE%"

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo [%DATE% %TIME%] failed to change directory: %PROJECT_DIR%>> "%LOG_FILE%"
  exit /b 1
)

call npm run operate >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"

if "%EXIT_CODE%"=="0" (
  echo [%DATE% %TIME%] operate success>> "%LOG_FILE%"
) else (
  echo [%DATE% %TIME%] operate failed exitCode=%EXIT_CODE%>> "%LOG_FILE%"
)

echo [%DATE% %TIME%] operate end>> "%LOG_FILE%"
exit /b %EXIT_CODE%
