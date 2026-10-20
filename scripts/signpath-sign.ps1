[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$InputPath,

    [string]$OutputPath,

    [string]$Description,

    [int]$WaitSeconds = 1800,

    [int]$PollSeconds = 5,

    [int]$DownloadRetries = 3,

    # Fetch the signed artifact of an already completed signing request
    # instead of submitting a new one.
    [string]$FromRequestId
)

$ErrorActionPreference = 'Stop'

$token = $env:SIGNPATH_API_TOKEN
$org   = $env:SIGNPATH_ORG_ID
$proj  = $env:SIGNPATH_PROJECT
$pol   = $env:SIGNPATH_POLICY

$missing = @()
if (-not $token) { $missing += 'SIGNPATH_API_TOKEN' }
if (-not $org)   { $missing += 'SIGNPATH_ORG_ID' }
if (-not $proj)  { $missing += 'SIGNPATH_PROJECT' }
if (-not $pol)   { $missing += 'SIGNPATH_POLICY' }
if ($missing.Count -gt 0) {
    throw "SignPath environment variable(s) missing: $($missing -join ', ')"
}
if (-not $InputPath -and -not $FromRequestId) {
    throw 'Either -InputPath or -FromRequestId is required.'
}

$curl = 'C:\Windows\System32\curl.exe'
if (-not (Test-Path -LiteralPath $curl)) { $curl = 'curl.exe' }

$apiRoot = "https://app.signpath.io/Api/v1/$org"
$auth    = "Authorization: Bearer $token"

# The signed artifact is staged next to the final output (same volume, so the
# swap is atomic). It is deliberately NOT staged in %TEMP%, which is cleaned
# aggressively on some machines and can delete a partial download.
$outDir = if ($OutputPath) { Split-Path -Parent ([System.IO.Path]::GetFullPath($OutputPath)) } else { (Get-Location).Path }
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$stagedFile = Join-Path $outDir ('.signpath-signed-' + [guid]::NewGuid().ToString('N') + '.tmp')

try {
    # ---- 1. submit signing request (multipart upload) ----
    if ($FromRequestId) {
        $location = "$apiRoot/SigningRequests/$FromRequestId"
        Write-Host "[signpath] using existing request: $location"
    }
    else {
        $inputFull = (Resolve-Path -LiteralPath $InputPath).Path
        if (-not $OutputPath) { $OutputPath = $inputFull }
        if (-not $Description) { $Description = "CoreX build $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }

        $fileInfo = Get-Item -LiteralPath $inputFull
        Write-Host ('[signpath] submitting {0} ({1:N0} bytes)' -f $fileInfo.Name, $fileInfo.Length)

        $hdrFile = Join-Path $outDir '.signpath-headers.tmp'
        $bodyFile = Join-Path $outDir '.signpath-body.tmp'
        try {
            $curlArgs = @(
                '-sS', '--show-error',
                '--connect-timeout', '30',
                '-X', 'POST',
                '-H', $auth,
                '-F', "projectSlug=$proj",
                '-F', "signingPolicySlug=$pol",
                '-F', "description=$Description",
                '-F', "artifact=@$inputFull",
                '-D', $hdrFile,
                '-o', $bodyFile,
                '-w', '%{http_code}',
                "$apiRoot/SigningRequests/SubmitWithArtifact"
            )
            $httpCode = (& $curl @curlArgs | Select-Object -Last 1)
            if ($httpCode -ne '201') {
                $body = if (Test-Path $bodyFile) { Get-Content $bodyFile -Raw } else { '' }
                throw "Submit failed (HTTP $httpCode). $body"
            }

            $location = $null
            foreach ($line in (Get-Content $hdrFile -ErrorAction SilentlyContinue)) {
                if ($line -match '^(?i)Location:\s*(\S+)') { $location = $Matches[1].Trim() }
            }
            if (-not $location) { throw "SignPath did not return a Location header. $(Get-Content $bodyFile -Raw)" }
            Write-Host "[signpath] request: $location"
        }
        finally {
            Remove-Item -LiteralPath $hdrFile, $bodyFile -Force -ErrorAction SilentlyContinue
        }
    }

    # ---- 2. poll until final status ----
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    $lastLog = Get-Date
    while ($true) {
        $st = Invoke-RestMethod -Uri "$location/Status" -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 60
        if ($st.isFinalStatus) { break }
        if ((Get-Date) -gt $deadline) {
            throw "Timed out after ${WaitSeconds}s waiting for SignPath (status: $($st.status)/$($st.workflowStatus))"
        }
        if (((Get-Date) - $lastLog).TotalSeconds -ge 20) {
            Write-Host "[signpath] waiting... $($st.status) / $($st.workflowStatus)"
            $lastLog = Get-Date
        }
        Start-Sleep -Seconds $PollSeconds
    }

    if ($st.status -ne 'Completed') {
        throw "Signing did not complete: status=$($st.status) workflowStatus=$($st.workflowStatus)"
    }

    # ---- 3. download signed artifact (with retries) ----
    if (-not $OutputPath) { throw 'OutputPath is required to store the signed artifact.' }

    $downloaded = $false
    for ($attempt = 1; $attempt -le $DownloadRetries -and -not $downloaded; $attempt++) {
        Write-Host "[signpath] downloading signed artifact (attempt $attempt/$DownloadRetries)..."
        $curlErr = Join-Path $outDir '.signpath-curl.tmp'
        $dlCode = (& $curl '-sS' '--show-error' '--connect-timeout' '30' '--retry' '3' '--retry-delay' '5' '--retry-all-errors' '-H' $auth '-o' $stagedFile '-w' '%{http_code}' "$location/SignedArtifact" 2> $curlErr | Select-Object -Last 1)
        $curlExit = $LASTEXITCODE
        $errText = if (Test-Path $curlErr) { (Get-Content $curlErr -Raw) } else { '' }
        Remove-Item -LiteralPath $curlErr -Force -ErrorAction SilentlyContinue

        if ($curlExit -eq 0 -and $dlCode -eq '200' -and (Test-Path $stagedFile) -and (Get-Item $stagedFile).Length -gt 0) {
            $downloaded = $true
        }
        else {
            Write-Warning "download attempt $attempt failed (curl exit $curlExit, HTTP $dlCode) $errText"
            Remove-Item -LiteralPath $stagedFile -Force -ErrorAction SilentlyContinue
            if ($attempt -lt $DownloadRetries) { Start-Sleep -Seconds 10 }
        }
    }

    if (-not $downloaded) { throw 'Signed artifact download failed after all retries.' }

    Move-Item -LiteralPath $stagedFile -Destination $OutputPath -Force
    Write-Host ('[signpath] SIGNED OK -> {0} ({1:N0} bytes)' -f $OutputPath, (Get-Item $OutputPath).Length)
}
finally {
    Remove-Item -LiteralPath $stagedFile -Force -ErrorAction SilentlyContinue
}
