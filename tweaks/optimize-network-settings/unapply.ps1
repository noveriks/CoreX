Write-Host "Reverting network tweaks to defaults..."

netsh int tcp set heuristics enabled
netsh int tcp set supplemental template=internet congestionprovider=default
netsh int tcp set global rss=default
netsh int tcp set global ecncapability=default
netsh int tcp set global timestamps=default
netsh int tcp set global fastopen=default
netsh int tcp set global fastopenfallback=default
netsh int tcp set supplemental template=custom icw=4

Write-Host "Network tweaks reverted to defaults."
