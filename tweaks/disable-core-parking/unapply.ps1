try {
    powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 0
    powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 0
    powercfg -setactive SCHEME_CURRENT
    Write-Host "CPU Core Parking restored"
} catch {
    Write-Host "Failed to restore core parking: $_"
}
