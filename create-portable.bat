@echo off
echo Building HKM Ministries CMS Desktop App...
echo.

REM Build the Vite app
echo Step 1: Building web app...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

REM Set environment variable to skip code signing
set CSC_IDENTITY_AUTO_DISCOVERY=false

REM Build only the unpacked version (skip portable/installer to avoid code signing issues)
echo.
echo Step 2: Building Electron app (unpacked)...
call npx electron-builder --win dir --config.win.sign=null
if errorlevel 1 (
    echo Electron build failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo The desktop app is located at:
echo release\win-unpacked\HKM Ministries CMS.exe
echo.
echo You can run it directly from there or copy the entire
echo "win-unpacked" folder to distribute the app.
echo.
pause
