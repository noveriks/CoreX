$path = "HKLM:\Software\Policies\Microsoft\Windows NT\Terminal Services\Client"
if (Test-Path $path) {
    if (Get-ItemProperty -Path $path -Name "RedirectionWarningDialogVersion" -ErrorAction SilentlyContinue) {
        Remove-ItemProperty -Path $path -Name "RedirectionWarningDialogVersion"
        Write-Host "RDP security warnings re-enabled."
    } else {
        Write-Host "Tweak was not applied."
    }
} else {
    Write-Host "Registry path does not exist, nothing to unapply."
}
