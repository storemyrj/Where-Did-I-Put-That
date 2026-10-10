# Publishes explicitly selected WDIPT changes using the repository's own Git credentials.
# Usage: .\scripts\publish-wdipt.ps1 -Title '...' -Description '...' -Files @('path/to/file')
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Title,
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Description,
    [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string[]]$Files,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $repo

function Run-Git {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & git @GitArgs; $status = $LASTEXITCODE }
    finally { $ErrorActionPreference = $previous }
    if ($status -ne 0) { throw ('Git failed: git ' + ($GitArgs -join ' ')) }
}
function Git-Value {
    param([string[]]$GitArgs)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $value = & git @GitArgs; $status = $LASTEXITCODE }
    finally { $ErrorActionPreference = $previous }
    if ($status -ne 0) { throw ('Git failed: ' + ($GitArgs -join ' ')) }
    return ($value | Out-String).Trim()
}

$expectedRemote = 'https://github.com/storemyrj/Where-Did-I-Put-That.git'
if ((Git-Value @('remote','get-url','origin')) -ne $expectedRemote) { throw 'Wrong GitHub remote; refusing to publish.' }
if ((Git-Value @('branch','--show-current')) -ne 'main') { throw 'Only main is authorized for this WDIPT workflow.' }
if ((Git-Value @('config','--local','--get','credential.https://github.com.username')) -ne 'storemyrj') { throw 'WDIPT Git credential account must be storemyrj.' }
$expectedEmail = '224520186+storemyrj@users.noreply.github.com'
if ((Git-Value @('config','user.email')) -ne $expectedEmail) { throw 'Unexpected Git commit identity.' }

$unsafe = '(?i)(^|[\\/])(?:\.env(?:\.|$)|\.dev\.vars(?:\.|$)|\.git(?:[\\/]|$))|\.(?:pem|p12|pfx|key)$'
foreach ($file in $Files) {
    if ([string]::IsNullOrWhiteSpace($file) -or $file -match $unsafe) { throw ('Refusing sensitive/invalid path: ' + $file) }
    if ([IO.Path]::IsPathRooted($file) -or (Test-Path -LiteralPath $file -PathType Container)) { throw ('Expected a repo-relative file, not a directory: ' + $file) }
}

if ($CheckOnly) {
    Write-Output 'OK: correct repository, branch, commit identity, local credential scope, and explicit file paths.'
    return
}

# No interactive credential prompts in unattended runs. Initial GCM OAuth is handled separately.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
$logDir = Join-Path $repo '.git\publish-logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ('publish-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
Start-Transcript -Path $log | Out-Null
try {
    if ((Git-Value @('diff','--cached','--name-only'))) { throw 'Files are already staged. Review and clear the Git index first.' }
    Write-Output 'Fetching origin/main...'
    Run-Git fetch origin main --quiet
    if ((Git-Value @('rev-parse','HEAD')) -ne (Git-Value @('rev-parse','origin/main'))) {
        throw 'Local main differs from origin/main. Reconcile before committing.'
    }

    Write-Output 'Checking TypeScript...'
    & pnpm exec tsc --noEmit
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed; no commit was made.' }
    Write-Output 'Checking recognition tests...'
    & pnpm run test:recognition
    if ($LASTEXITCODE -ne 0) { throw 'Recognition tests failed; no commit was made.' }
    Write-Output 'Checking suggestions tests...'
    & pnpm run test:suggestions
    if ($LASTEXITCODE -ne 0) { throw 'Suggestions tests failed; no commit was made.' }
    Write-Output 'Checking production build...'
    & pnpm run build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed; no commit was made.' }

    Write-Output 'Staging only the requested files...'
    Run-Git add -- @Files
    $staged = Git-Value @('diff','--cached','--name-only')
    $stagedPaths = @($staged -split '\r?\n')
    foreach ($path in $stagedPaths) {
        if ($Files -notcontains $path -or $path -match $unsafe) {
            throw ('An unapproved file was staged: ' + $path)
        }
    }
    if (-not $staged) { throw 'No selected changes to commit.' }
    if ($staged -match $unsafe) { throw 'Sensitive filename detected in staged changes.' }
    Run-Git diff --cached --check

    Write-Output 'Creating commit...'
    Run-Git commit -m $Title -m $Description
    $sha = Git-Value @('rev-parse','HEAD')
    Write-Output 'Pushing to storemyrj WDIPT main...'
    Run-Git push origin 'HEAD:refs/heads/main'

    $verified = $false
    $remoteSha = ''
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        $remoteRecord = Git-Value @('ls-remote','origin','refs/heads/main')
        if ($remoteRecord -match '^([0-9a-f]{40})\s+refs/heads/main$') {
            $remoteSha = $Matches[1]
            if ($remoteSha -eq $sha) { $verified = $true; break }
        }
        Write-Output ('Waiting for remote SHA confirmation (' + $attempt + '/5)...')
        Start-Sleep -Seconds 2
    }
    if (-not $verified) {
        throw ('Push verification failed. Local: ' + $sha + '; remote: ' + $remoteSha)
    }
    Write-Output ('OK: VERIFIED_PUSH ' + $sha)
    Write-Output ('Log: ' + $log)
}
finally {
    Stop-Transcript | Out-Null
}
