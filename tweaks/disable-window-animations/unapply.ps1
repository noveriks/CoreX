try {
    $path = "HKCU:\Control Panel\Desktop"
    $currentMask = [byte[]](Get-ItemProperty -Path $path -Name "UserPreferencesMask").UserPreferencesMask

    $currentMask[4] = $currentMask[4] -bor 0x0F
    Set-ItemProperty -Path $path -Name "UserPreferencesMask" -Value $currentMask -Type Binary

    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "1"
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewAlphaSelect" -Value 1
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewShadow" -Value 1

    Write-Host "Window animations restored"
} catch {
    Write-Host "Failed to restore window animations: $_"
}
