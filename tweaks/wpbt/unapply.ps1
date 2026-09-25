# Credit to Chris Titus Tech

$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"
$regName = "DisableWpbtExecution"

if (Test-Path $regPath) {
    if (Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue) {
        Remove-ItemProperty -Path $regPath -Name $regName
        Write-Host "WPBT execution restored to default."
    } else {
        Write-Host "Tweak was not applied."
    }
} else {
    Write-Host "Registry path does not exist, nothing to unapply."
}