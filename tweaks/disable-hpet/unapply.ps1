try {
    bcdedit /deletevalue useplatformtick 2>&1
    bcdedit /set disabledynamictick no 2>&1
    Write-Host "HPET settings restored"
} catch {
    Write-Host "Failed to restore HPET: $_"
}
