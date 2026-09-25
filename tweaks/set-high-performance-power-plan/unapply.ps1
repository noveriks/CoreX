try {
    $balancedGuid = "381b4222-f694-41f0-9685-ff5bb260df2e"
    powercfg /setactive $balancedGuid
    Write-Host "Balanced power plan restored"
} catch {
    Write-Host "Failed to restore balanced power plan: $_"
}
