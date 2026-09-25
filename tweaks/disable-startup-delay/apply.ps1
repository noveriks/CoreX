try {
    $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize"

    if (-not (Test-Path $path)) {
        New-Item -Path $path -Force | Out-Null
    }

    Set-ItemProperty -Path $path -Name "StartupDelayInMSec" -Value 0 -Type DWord
    Write-Host "Startup delay disabled"
} catch {
    Write-Host "Failed to disable startup delay: $_"
}
