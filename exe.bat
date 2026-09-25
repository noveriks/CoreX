@echo off
echo y | node build.js --registry
if %errorlevel% neq 0 (
    echo Error updating registry.
    exit /b 1
)
node build.js --build
if %errorlevel% neq 0 (
    echo Error building the application.
    exit /b 1
)
echo.
echo Build completed successfully.
echo The installer(s) can be found in the dist directory.
pause