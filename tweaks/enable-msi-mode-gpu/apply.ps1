try {
    $gpuDevices = Get-CimInstance Win32_PnPEntity | Where-Object {
        $_.PNPClass -eq "Display" -or $_.Name -match "NVIDIA|AMD|Intel.*Graphics|Intel.*Display"
    }

    if (-not $gpuDevices) {
        Write-Host "No GPU devices found"
        return
    }

    foreach ($gpu in $gpuDevices) {
        $deviceId = $gpu.DeviceID
        $instanceId = $gpu.PNPDeviceID

        $pciPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$instanceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"

        if (-not (Test-Path $pciPath)) {
            New-Item -Path $pciPath -Force | Out-Null
        }

        Set-ItemProperty -Path $pciPath -Name "MSISupported" -Value 1 -Type DWord
        Write-Host "Enabled MSI mode for: $($gpu.Name)"
    }

    Write-Host "MSI mode enabled for GPU. Reboot required to take effect."
} catch {
    Write-Host "Failed to enable MSI mode: $_"
}
