try {
    Set-Service -Name WSearch -StartupType AutomaticDelayedStart
    Start-Service -Name WSearch -ErrorAction SilentlyContinue
    Write-Host "Windows Search Indexing restored"
} catch {
    Write-Host "Failed to restore search indexing: $_"
}
