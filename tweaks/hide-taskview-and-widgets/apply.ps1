# Hide Task View button
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowTaskViewButton" -Type DWord -Value 0

# Remove Widgets package
Get-AppxPackage *WebExperience* | Remove-AppxPackage -ErrorAction SilentlyContinue

# Restart Explorer to apply changes
Stop-Process -Name explorer -Force

Write-Host "Widgets removed and Task View hidden."

