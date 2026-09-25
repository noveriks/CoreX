# Remove all Bing apps
Get-AppxPackage *BingNews* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingWeather* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingFinance* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingMaps* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingSports* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingTravel* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingFoodAndDrink* | Remove-AppxPackage -ErrorAction SilentlyContinue
Get-AppxPackage *BingHealthAndFitness* | Remove-AppxPackage -ErrorAction SilentlyContinue

$searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
if (!(Test-Path $searchPath)) {
    New-Item -Path $searchPath -Force | Out-Null
}
Set-ItemProperty -Path $searchPath -Name "BingSearchEnabled" -Type DWord -Value 0
Set-ItemProperty -Path $searchPath -Name "CortanaConsent" -Type DWord -Value 0

$explorerPath = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
if (!(Test-Path $explorerPath)) {
    New-Item -Path $explorerPath -Force | Out-Null
}
Set-ItemProperty -Path $explorerPath -Name "DisableSearchBoxSuggestions" -Type DWord -Value 1

Write-Host "Bing apps removed and Bing search disabled."