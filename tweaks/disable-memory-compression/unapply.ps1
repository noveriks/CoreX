try {
    Enable-MMAgent -MemoryCompression -ErrorAction Stop
    Write-Host "Memory Compression restored"
} catch {
    Write-Host "Failed to restore memory compression: $_"
}
