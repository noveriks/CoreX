try {
    powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100
    powercfg -setdcvalueindex SCHEME_CURRENT SUB_PROCESSOR CPMINCORES 100
    powercfg -setactive SCHEME_CURRENT
    Write-Host "CPU Core Parking disabled (all cores forced active)"
} catch {
    Write-Host "Failed to disable core parking: $_"
}
