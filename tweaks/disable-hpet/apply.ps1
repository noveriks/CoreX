try {
    bcdedit /deletevalue useplatformclock 2>&1
    bcdedit /set disabledynamictick yes 2>&1
    bcdedit /set useplatformtick yes 2>&1
    Write-Host "HPET disabled successfully"
} catch {
    Write-Host "Failed to disable HPET: $_"
}
