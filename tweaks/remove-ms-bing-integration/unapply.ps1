$searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
if (Test-Path $searchPath) {
    Set-ItemProperty -Path $searchPath -Name "BingSearchEnabled" -Type DWord -Value 1
    Remove-ItemProperty -Path $searchPath -Name "CortanaConsent" -ErrorAction SilentlyContinue
}

$explorerPath = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
if (Test-Path $explorerPath) {
    Remove-ItemProperty -Path $explorerPath -Name "DisableSearchBoxSuggestions" -ErrorAction SilentlyContinue
}

Write-Host "Reinstalling Bing apps..."
winget install 9WZDNCRFHVFW --accept-source-agreements --accept-package-agreements --silent  # Bing News
winget install 9WZDNCRFJ3Q2 --accept-source-agreements --accept-package-agreements --silent  # Bing Weather

Write-Host "Bing search re-enabled. Some apps may need to be reinstalled from Microsoft Store."