# Check if Electron is running and get window info
Get-Process -Name electron -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("Process: {0} PID: {1} Title: {2}" -f $_.ProcessName, $_.Id, $_.MainWindowTitle)
}
if (-not (Get-Process -Name electron -ErrorAction SilentlyContinue)) {
    Write-Host "No Electron process running"
}
