try {
    $gpuDevices = Get-CimInstance Win32_PnPEntity | Where-Object {
        $_.PNPClass -eq "Display" -or $_.Name -match "NVIDIA|AMD|Intel.*Graphics|Intel.*Display"
    }

    foreach ($gpu in $gpuDevices) {
        $instanceId = $gpu.PNPDeviceID
        $pciPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$instanceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"

        if (Test-Path $pciPath) {
            Set-ItemProperty -Path $pciPath -Name "MSISupported" -Value 0 -Type DWord
            Write-Host "Disabled MSI mode for: $($gpu.Name)"
        }
    }

    Write-Host "MSI mode disabled for GPU. Reboot required to take effect."
} catch {
    Write-Host "Failed to disable MSI mode: $_"
}
