try {
    $advancedPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"

    Set-ItemProperty -Path $advancedPath -Name "HideFileExt" -Value 1 -Type DWord
    Set-ItemProperty -Path $advancedPath -Name "Hidden" -Value 2 -Type DWord
    Set-ItemProperty -Path $advancedPath -Name "ShowSuperHidden" -Value 0 -Type DWord

    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Process explorer

    Write-Host "File extensions and hidden files hidden again"
} catch {
    Write-Host "Failed to hide file extensions: $_"
}
