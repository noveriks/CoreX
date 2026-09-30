[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [string]$OutputPath,

    [string]$Description,

    [int]$WaitSeconds = 1800,

    [int]$PollSeconds = 5
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

$inputFull = (Resolve-Path -LiteralPath $InputPath).Path
if (-not $OutputPath) { $OutputPath = $inputFull }
if (-not $Description) { $Description = "CoreX build $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" }

$curl = 'C:\Windows\System32\curl.exe'
if (-not (Test-Path -LiteralPath $curl)) { $curl = 'curl.exe' }

$apiRoot = "https://app.signpath.io/Api/v1/$org"
$auth    = "Authorization: Bearer $token"

$fileInfo = Get-Item -LiteralPath $inputFull
Write-Host ('[signpath] submitting {0} ({1:N0} bytes)' -f $fileInfo.Name, $fileInfo.Length)

$tmpDir = Join-Path $env:TEMP ('signpath-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
$hdrFile = Join-Path $tmpDir 'headers.txt'
$bodyFile = Join-Path $tmpDir 'body.json'
$tmpOut = Join-Path $tmpDir $fileInfo.Name

try {
    # ---- 1. submit signing request (multipart upload) ----
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

    # ---- 3. download signed artifact ----
    $dlCode = (& $curl '-sS' '--show-error' '--connect-timeout' '30' '-H' $auth '-o' $tmpOut '-w' '%{http_code}' "$location/SignedArtifact" | Select-Object -Last 1)
    if ($dlCode -ne '200') { throw "Signed artifact download failed (HTTP $dlCode)" }
    if (-not (Test-Path $tmpOut) -or (Get-Item $tmpOut).Length -eq 0) { throw 'Signed artifact download was empty' }

    Copy-Item -LiteralPath $tmpOut -Destination $OutputPath -Force
    Write-Host ('[signpath] SIGNED OK -> {0} ({1:N0} bytes)' -f $OutputPath, (Get-Item $OutputPath).Length)
}
finally {
    Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}
