$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$marker = "# CoreX Telemetry Block"

try {
    $content = Get-Content $hostsFile -Raw
    $lines = $content -split "`n"
    $markerIndex = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match [regex]::Escape($marker)) {
            $markerIndex = $i
            break
        }
    }

    if ($markerIndex -ge 0) {
        $before = $lines[0..($markerIndex - 1)]
        $after = @()
        for ($i = $markerIndex + 1; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^0\.0\.0\.0\s+") { continue }
            if ($lines[$i].Trim() -eq "") { continue }
            $after += $lines[$i]
        }
        $newContent = ($before + $after) -join "`n"
        Set-Content -Path $hostsFile -Value $newContent
        Write-Host "Telemetry block removed from hosts file"
    } else {
        Write-Host "No telemetry block found in hosts file"
    }

    ipconfig /flushdns | Out-Null
    Write-Host "DNS cache flushed"
} catch {
    Write-Host "Failed to remove telemetry block: $_"
}
