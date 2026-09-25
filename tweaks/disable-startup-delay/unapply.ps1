try {
    $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize"
    Remove-ItemProperty -Path $path -Name "StartupDelayInMSec" -ErrorAction SilentlyContinue
    Write-Host "Startup delay restored"
} catch {
    Write-Host "Failed to restore startup delay: $_"
}
