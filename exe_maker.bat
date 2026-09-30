@echo off
setlocal EnableExtensions
title CoreX Installer Builder
cd /d "%~dp0"

echo ============================================================
echo    CoreX - build CoreX-Setup.exe (NSIS installer)
echo ============================================================
echo.
if defined SIGNPATH_API_TOKEN (
  echo    Signing: SignPath ENABLED ^(CoreX.exe + installer^)
) else (
  echo    Signing: disabled ^(SIGNPATH_API_TOKEN not set - build will be unsigned^)
)
echo.

if /i "%~1"=="/nopause" (set "NOPAUSE=1") else (set "NOPAUSE=")

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH. Install Node.js first.
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
) else (
  echo [1/3] Dependencies already installed.
)

rem Build outside the project folder so file locks inside the repo cannot
rem break electron-builder, then copy the finished installer into release\.
set "OUTDIR=%TEMP%\corex-build"
if exist "%OUTDIR%" rmdir /s /q "%OUTDIR%" 2>nul

echo [2/3] Building installer... (takes a few minutes)
echo.
call npx electron-builder --win nsis "--config.directories.output=%OUTDIR%"
if errorlevel 1 goto :fail
echo.

echo [3/3] Copying installer into release\
if not exist "release" mkdir "release"
set "FOUND="
for %%F in ("%OUTDIR%\CoreX-Setup.exe") do (
  if not "%%~F"=="" (
    copy /y "%%~F" "release\" >nul
    if not errorlevel 1 set "FOUND=1"
  )
)
if not defined FOUND goto :fail

rmdir /s /q "%OUTDIR%" 2>nul

echo.
echo ============================================================
echo  [OK] Installer created:
for %%F in ("release\CoreX-Setup.exe") do echo     %CD%\release\%%~nxF  ^(%%~zF bytes^)
echo ============================================================
echo.
if defined NOPAUSE exit /b 0
choice /c YN /n /m "Run the installer now? [Y/N] "
if errorlevel 2 exit /b 0
for %%F in ("release\CoreX-Setup.exe") do start "" "%%~F"
exit /b 0

:fail
echo.
echo ============================================================
echo  [ERROR] Build failed - read the output above.
echo ============================================================
if defined NOPAUSE exit /b 1
pause
exit /b 1
