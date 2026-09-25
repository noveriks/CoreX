$path = "HKLM:\Software\Policies\Microsoft\Windows NT\Terminal Services\Client"
if (-not (Test-Path $path)) {
    New-Item -Path $path -Force | Out-Null
}
Set-ItemProperty -Path $path -Name "RedirectionWarningDialogVersion" -Value 1 -Type DWord
Write-Host "RDP security warnings disabled."
