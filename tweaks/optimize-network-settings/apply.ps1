Write-Host "Applying network tweaks..."

netsh int tcp set heuristics disabled
netsh int tcp set supplemental template=internet congestionprovider=ctcp
netsh int tcp set global rss=enabled
netsh int tcp set global ecncapability=enabled
netsh int tcp set global timestamps=disabled
netsh int tcp set global fastopen=enabled
netsh int tcp set global fastopenfallback=enabled
netsh int tcp set supplemental template=custom icw=10

Write-Host "Network tweaks applied successfully."
