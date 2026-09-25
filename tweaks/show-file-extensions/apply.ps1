try {
    $advancedPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"

    Set-ItemProperty -Path $advancedPath -Name "HideFileExt" -Value 0 -Type DWord
    Set-ItemProperty -Path $advancedPath -Name "Hidden" -Value 1 -Type DWord
    Set-ItemProperty -Path $advancedPath -Name "ShowSuperHidden" -Value 1 -Type DWord

    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Process explorer

    Write-Host "File extensions and hidden files now visible"
} catch {
    Write-Host "Failed to show file extensions: $_"
}
