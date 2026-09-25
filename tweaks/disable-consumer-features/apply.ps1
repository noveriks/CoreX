# Credit to Chris Titus Tech

$regPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent"
$regName = "DisableWindowsConsumerFeatures"
$applyValue = 1

if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Set-ItemProperty -Path $regPath -Name $regName -Value $applyValue -Type DWord

Write-Host "Consumer Features disabled."