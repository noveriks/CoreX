Get-Process -Name electron -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("Id={0} Title={1}" -f $_.Id, $_.MainWindowTitle)
}
if (-not (Get-Process -Name electron -ErrorAction SilentlyContinue)) {
    Write-Host "No Electron process"
}
