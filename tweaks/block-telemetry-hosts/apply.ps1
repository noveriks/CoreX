$hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
$marker = "# CoreX Telemetry Block"

$telemetryDomains = @(
    "0.0.0.0 vortex.data.microsoft.com",
    "0.0.0.0 vortex-win.data.microsoft.com",
    "0.0.0.0 telecommand.telemetry.microsoft.com",
    "0.0.0.0 telemetry.microsoft.com",
    "0.0.0.0 oca.telemetry.microsoft.com",
    "0.0.0.0 sqm.telemetry.microsoft.com",
    "0.0.0.0 wat.telemetry.microsoft.com",
    "0.0.0.0 settings-sandbox.data.microsoft.com",
    "0.0.0.0 settings-win.data.microsoft.com",
    "0.0.0.0 v10.vortex-win.data.microsoft.com",
    "0.0.0.0 v20.vortex-win.data.microsoft.com",
    "0.0.0.0 v10.vortex.data.microsoft.com",
    "0.0.0.0 v20.vortex.data.microsoft.com",
    "0.0.0.0 df.telemetry.microsoft.com",
    "0.0.0.0 reports.wes.df.telemetry.microsoft.com",
    "0.0.0.0 bedivf.telemetry.microsoft.com",
    "0.0.0.0 telemetry.appex.bing.net",
    "0.0.0.0 telemetry.urs.microsoft.com",
    "0.0.0.0 telemetry.micloud.azure.com",
    "0.0.0.0 telemetry.microsoft.com",
    "0.0.0.0 context.data.microsoft.com",
    "0.0.0.0 cy2.vortex.data.microsoft.com.akadns.net",
    "0.0.0.0 cyberdiagnostics.telemetry.microsoft.com",
    "0.0.0.0 events.data.microsoft.com",
    "0.0.0.0 functional.events.data.microsoft.com",
    "0.0.0.0 jet.wes.df.telemetry.microsoft.com",
    "0.0.0.0 self.events.data.microsoft.com",
    "0.0.0.0 services.wes.df.telemetry.microsoft.com",
    "0.0.0.0 settings.data.microsoft.com",
    "0.0.0.0 settings.data.microsoft.com.akadns.net",
    "0.0.0.0 sgmetricskernel.data.microsoft.com",
    "0.0.0.0 smartscreen.data.microsoft.com",
    "0.0.0.0 storecatalog.data.microsoft.com",
    "0.0.0.0 telecommand.telemetry.microsoft.com",
    "0.0.0.0 telemetry.data.microsoft.com",
    "0.0.0.0 telemetry.microsoft.com",
    "0.0.0.0 telemetry.office.microsoft.com",
    "0.0.0.0 tsfe.trafficshaping.dsp.mp.microsoft.com",
    "0.0.0.0 watson.microsoft.com",
    "0.0.0.0 watson.ppe.telemetry.microsoft.com",
    "0.0.0.0 watson.telemetry.microsoft.com",
    "0.0.0.0 watson.telemetry.microsoft.com.nsatc.net",
    "0.0.0.0 wes.df.telemetry.microsoft.com",
    "0.0.0.0 www.vortex.data.microsoft.com",
    "0.0.0.0 www.vortex-win.data.microsoft.com",
    "0.0.0.0 advertise.bin.mp.microsoft.com",
    "0.0.0.0 ads.microsoft.com",
    "0.0.0.0 ads.msn.com",
    "0.0.0.0 bingapps-www.akamaized.net",
    "0.0.0.0 ci-telemetry.telemetry.microsoft.com",
    "0.0.0.0 cy2.vortex.data.microsoft.com",
    "0.0.0.0 db5.vortex.data.microsoft.com",
    "0.0.0.0 errors.data.microsoft.com",
    "0.0.0.0 fabric.io",
    "0.0.0.0 functional.events.data.microsoft.com",
    "0.0.0.0 hostloginsights.blob.core.windows.net",
    "0.0.0.0 images.streamhub.windows.com",
    "0.0.0.0 insiderapi.trafficmanager.net",
    "0.0.0.0 oca.telemetry.microsoft.com",
    "0.0.0.0 oneget.bing.githubusercontent.com",
    "0.0.0.0 platform.telemetry.microsoft.com",
    "0.0.0.0 pre.trafficmanager.net",
    "0.0.0.0 r1.bletchley.telemetry.microsoft.com",
    "0.0.0.0 riak.telemetry.microsoft.com",
    "0.0.0.0 self.events.data.microsoft.com",
    "0.0.0.0 services.wes.df.telemetry.microsoft.com",
    "0.0.0.0 settings-sandbox.data.microsoft.com",
    "0.0.0.0 sqm.telemetry.microsoft.com",
    "0.0.0.0 static.telemetry.microsoft.com",
    "0.0.0.0 store-images.s-microsoft.com",
    "0.0.0.0 store-images.microsoft.com",
    "0.0.0.0 telecommand.telemetry.microsoft.com",
    "0.0.0.0 telemetry.microsoft.com",
    "0.0.0.0 telemetry.urs.microsoft.com",
    "0.0.0.0 ves.events.data.microsoft.com",
    "0.0.0.0 v10.events.data.microsoft.com",
    "0.0.0.0 v20.events.data.microsoft.com",
    "0.0.0.0 vortex.data.microsoft.com",
    "0.0.0.0 vortex-win.data.microsoft.com",
    "0.0.0.0 watson.telemetry.microsoft.com",
    "0.0.0.0 windowsupdate.microsoft.com",
    "0.0.0.0 www.googletagmanager.com",
    "0.0.0.0 cy2.vortex.data.microsoft.com.akadns.net",
    "0.0.0.0 diagnostics.support.microsoft.com",
    "0.0.0.0 g빙data.microsoft.com",
    "0.0.0.0ortex-win.data.microsoft.com"
)

$currentContent = Get-Content $hostsFile -Raw -ErrorAction SilentlyContinue

if ($currentContent -match [regex]::Escape($marker)) {
    Write-Host "Telemetry block already exists in hosts file"
} else {
    $block = "`n$marker`n" + ($telemetryDomains -join "`n") + "`n"
    Add-Content -Path $hostsFile -Value $block
    Write-Host "Blocked $($telemetryDomains.Count) telemetry domains via hosts file"
}

try {
    ipconfig /flushdns | Out-Null
    Write-Host "DNS cache flushed"
} catch {
    Write-Host "Failed to flush DNS cache"
}
