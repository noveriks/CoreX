Write-Host "=== Testing CPU Model from Registry ==="
try {
    $p = Get-ItemProperty -Path "HKLM:\HARDWARE\DESCRIPTION\System\CentralProcessor\0" -ErrorAction Stop
    Write-Host ("CPU: {0}" -f $p.ProcessorName)
    Write-Host ("All props: {0}" -f ($p.PSObject.Properties.Name -join ", "))
} catch {
    Write-Host "Could not read CPU model: $_"
}

Write-Host ""
Write-Host "=== Testing si.cpu() equivalent via PowerShell ==="
$cpu = Get-CimInstance Win32_Processor
Write-Host ("Name: {0}" -f $cpu.Name)
Write-Host ("LoadPercent: {0}" -f $cpu.LoadPercentage)

Write-Host ""
Write-Host "=== Testing all WMI thermal classes ==="
Get-CimClass -Namespace root/wmi -ClassName "*thermal*" -ErrorAction SilentlyContinue | ForEach-Object {
    $inst = Get-CimInstance -ClassName $_.CimClassName -Namespace root/wmi -ErrorAction SilentlyContinue
    if ($inst) { Write-Host ("Found: {0}" -f $_.CimClassName) }
}

Write-Host ""
Write-Host "=== Testing GPU info ==="
Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("GPU: {0}" -f $_.Name)
}
