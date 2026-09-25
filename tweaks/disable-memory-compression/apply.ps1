try {
    Disable-MMAgent -MemoryCompression -ErrorAction Stop
    Write-Host "Memory Compression disabled"
} catch {
    Write-Host "Failed to disable memory compression: $_"
}
