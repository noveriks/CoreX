try {
    $ultimateGuid = "e9a42b02-d5df-448d-aa00-03f14749eb61"
    $highPerfGuid = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c"
    $balancedGuid = "381b4222-f694-41f0-9685-ff5bb260df2e"

    $availablePlans = powercfg /list | Select-String "Power Scheme GUID"

    if ($availablePlans -match $ultimateGuid) {
        powercfg /setactive $ultimateGuid
        Write-Host "Ultimate Performance power plan activated"
    } elseif ($availablePlans -match $highPerfGuid) {
        powercfg /setactive $highPerfGuid
        Write-Host "High Performance power plan activated"
    } else {
        powercfg -duplicatescheme $highPerfGuid 2>&1 | Out-Null
        powercfg /setactive $highPerfGuid
        Write-Host "High Performance power plan created and activated"
    }

    powercfg /change monitor-timeout-ac 0
    powercfg /change standby-timeout-ac 0
    powercfg /change hibernate-timeout-ac 0

    Write-Host "Monitor and standby timeouts disabled on AC power"
} catch {
    Write-Host "Failed to set high performance power plan: $_"
}
