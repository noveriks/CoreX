try {
    Set-Service -Name SysMain -StartupType Automatic
    Start-Service -Name SysMain -ErrorAction SilentlyContinue
    Write-Host "SysMain (Superfetch) restored"
} catch {
    Write-Host "Failed to restore SysMain: $_"
}
