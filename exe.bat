@echo off
setlocal EnableExtensions EnableDelayedExpansion
title CoreX Installer Builder
cd /d "%~dp0"

echo ============================================
echo   CoreX - NSIS installer builder
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  goto :fail
)

if not exist "node_modules\electron-builder\package.json" (
  echo [1/3] Installing dependencies...
  where pnpm >nul 2>nul
  if not errorlevel 1 (
    call pnpm install
  ) else (
    call npm install
  )
  if errorlevel 1 goto :fail
)

set "OUTDIR=%TEMP%\corex-build"
if exist "%OUTDIR%" rmdir /s /q "%OUTDIR%" 2>nul

echo [2/3] Building installer (this takes a few minutes)...
call npx electron-builder --win nsis --config.directories.output="%OUTDIR%"
if errorlevel 1 goto :fail

echo [3/3] Copying installer to release\
if not exist "release" mkdir "release"
copy /y "%OUTDIR%\CoreX-Setup.exe" "release\" >nul
if errorlevel 1 goto :fail

echo.
echo [OK] Installer created:
dir /b "release\CoreX-Setup.exe"
echo.
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed. Read the output above.
pause
exit /b 1