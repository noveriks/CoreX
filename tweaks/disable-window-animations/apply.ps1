try {
    $path = "HKCU:\Control Panel\Desktop"
    $currentMask = [byte[]](Get-ItemProperty -Path $path -Name "UserPreferencesMask").UserPreferencesMask

    $currentMask[4] = $currentMask[4] -band 0xF0
    Set-ItemProperty -Path $path -Name "UserPreferencesMask" -Value $currentMask -Type Binary

    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0"
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewAlphaSelect" -Value 0
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewShadow" -Value 0
    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" -Value ([byte[]]($currentMask)) -Type Binary

    Write-Host "Window animations disabled"
} catch {
    Write-Host "Failed to disable window animations: $_"
}
