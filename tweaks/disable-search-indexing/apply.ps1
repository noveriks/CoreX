try {
    Stop-Service -Name WSearch -Force -ErrorAction SilentlyContinue
    Set-Service -Name WSearch -StartupType Disabled
    Write-Host "Windows Search Indexing disabled"
} catch {
    Write-Host "Failed to disable search indexing: $_"
}
