# Disable SysMain (SuperFetch) Service
Write-Host "Disabling SysMain (SuperFetch) service..." -ForegroundColor Cyan

# Stop the service
Stop-Service -Name "SysMain" -Force -ErrorAction SilentlyContinue

# Disable the service
Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction Stop

Write-Host "SysMain service has been disabled successfully." -ForegroundColor Green