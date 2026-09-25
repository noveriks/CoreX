Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowTaskViewButton" -Type DWord -Value 1

Write-Host "Reinstalling Windows Widgets..."
winget install 9MSSGKG348SP --accept-source-agreements --accept-package-agreements --silent

Stop-Process -Name explorer -Force

Write-Host "Task View restored. Widgets reinstalled (may require sign-out to appear)."


