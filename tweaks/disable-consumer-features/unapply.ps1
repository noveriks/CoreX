# Credit to Chris Titus Tech

$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
$regName = "DisableWindowsConsumerFeatures"

if (Test-Path $regPath) {
    if (Get-ItemProperty -Path $regPath -Name $regName -ErrorAction SilentlyContinue) {
        Remove-ItemProperty -Path $regPath -Name $regName
        Write-Host "Consumer Features restored to default."
    } else {
        Write-Host "Tweak was not applied."
    }
} else {
    Write-Host "Registry path does not exist, nothing to unapply."
}