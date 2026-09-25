try {
    $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    Set-ItemProperty -Path $path -Name "VisualFXSetting" -Value 2 -Type DWord

    $desktopPath = "HKCU:\Control Panel\Desktop"
    Set-ItemProperty -Path $desktopPath -Name "DragFullWindows" -Value "0"
    Set-ItemProperty -Path $desktopPath -Name "MenuShowDelay" -Value "0"
    Set-ItemProperty -Path $desktopPath -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type Binary

    $systemPath = "HKCU:\Control Panel\Desktop\WindowMetrics"
    Set-ItemProperty -Path $systemPath -Name "MinAnimate" -Value "0"

    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewAlphaSelect" -Value 0
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewShadow" -Value 0

    Write-Host "Visual effects set to Best Performance"
} catch {
    Write-Host "Failed to disable visual effects: $_"
}
