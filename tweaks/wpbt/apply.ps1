# Credit to Chris Titus Tech

$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"
$regName = "DisableWpbtExecution"
$applyValue = 1

if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

Set-ItemProperty -Path $regPath -Name $regName -Value $applyValue -Type DWord

Write-Host "WPBT execution disabled."