try {
    $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
    Set-ItemProperty -Path $path -Name "VisualFXSetting" -Value 0 -Type DWord

    $desktopPath = "HKCU:\Control Panel\Desktop"
    Set-ItemProperty -Path $desktopPath -Name "DragFullWindows" -Value "1"
    Set-ItemProperty -Path $desktopPath -Name "MenuShowDelay" -Value "400"
    Set-ItemProperty -Path $desktopPath -Name "UserPreferencesMask" -Value ([byte[]](0x9E,0x3E,0x07,0x80,0x12,0x00,0x00,0x00)) -Type Binary

    $systemPath = "HKCU:\Control Panel\Desktop\WindowMetrics"
    Set-ItemProperty -Path $systemPath -Name "MinAnimate" -Value "1"

    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewAlphaSelect" -Value 1
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ListviewShadow" -Value 1

    Write-Host "Visual effects restored to defaults"
} catch {
    Write-Host "Failed to restore visual effects: $_"
}
