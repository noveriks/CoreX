try {
    Stop-Service -Name SysMain -Force -ErrorAction SilentlyContinue
    Set-Service -Name SysMain -StartupType Disabled
    Write-Host "SysMain (Superfetch) disabled successfully"
} catch {
    Write-Host "Failed to disable SysMain: $_"
}
