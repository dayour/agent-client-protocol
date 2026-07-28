#!/usr/bin/env pwsh
#Requires -Version 7.0

<#
.SYNOPSIS
    Runs the full CI gate set locally, mirroring .github/workflows/ci.yml.

.DESCRIPTION
    This repository is maintained as a fork, and GitHub disables Actions on forks until a
    maintainer enables them by hand. Until that happens, this script is the authoritative
    build verification: it runs the same gates CI would, in the same order, and fails the
    same way.

    Each gate writes a full log under .ci-local/ and the console shows a pass/fail summary.
    The script exits non-zero if any gate fails, so it can be used as a pre-push hook.

.PARAMETER Only
    Run just the named gates. Accepts partial, case-insensitive matches.

.PARAMETER Skip
    Skip the named gates. Accepts partial, case-insensitive matches.

.PARAMETER SkipSlow
    Skip gates marked slow: the feature-combination matrix and the MSRV check.

.PARAMETER List
    Print the gate list and exit without running anything.

.PARAMETER KeepGenerated
    Leave regenerated artifacts in the working tree if the drift gate fails. By default the
    script restores them so a failed run does not leave the tree dirty.

.EXAMPLE
    ./scripts/ci-local.ps1

.EXAMPLE
    ./scripts/ci-local.ps1 -Only clippy,test

.EXAMPLE
    ./scripts/ci-local.ps1 -SkipSlow
#>

[CmdletBinding()]
param(
    [string[]]$Only,
    [string[]]$Skip,
    [switch]$SkipSlow,
    [switch]$List,
    [switch]$KeepGenerated
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Repository root and environment preconditions
# ---------------------------------------------------------------------------

$repoRoot = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    Write-Error 'Not inside a git repository. Run this from a checkout of the ACP schema repo.'
    exit 2
}
$repoRoot = $repoRoot.Trim() -replace '/', [IO.Path]::DirectorySeparatorChar
Set-Location $repoRoot

# npm and cargo resolve their working directory through cmd.exe on Windows, which cannot
# hold a UNC path as the current directory. It silently falls back to C:\Windows, so npm
# reports a missing package.json and a drift gate would report a false pass because the
# generator never ran. Refuse rather than produce a meaningless green run.
if ($repoRoot.StartsWith('\\')) {
    Write-Host ''
    Write-Host 'ERROR: this checkout is on a UNC path:' -ForegroundColor Red
    Write-Host "  $repoRoot"
    Write-Host ''
    Write-Host 'npm and cargo cannot run here. cmd.exe cannot hold a UNC working directory and'
    Write-Host 'falls back to C:\Windows, which makes the generated-artifact gate pass without'
    Write-Host 'ever running the generator.'
    Write-Host ''
    Write-Host 'Use a drive-backed worktree instead:'
    Write-Host '  git worktree add E:\acp-work <branch>'
    Write-Host ''
    exit 2
}

$logDir = Join-Path $repoRoot '.ci-local'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# ---------------------------------------------------------------------------
# Gate execution helpers
# ---------------------------------------------------------------------------

function Invoke-Gate {
    <#
    Runs a native command, tees its output to a log, and returns the real exit code.

    Deliberately avoids piping through Select-Object: in PowerShell a pipeline element that
    stops early terminates the native command and leaves $LASTEXITCODE reflecting the
    pipeline rather than the process, which silently turns failures into passes.
    #>
    param(
        [Parameter(Mandatory)][string]$LogName,
        [Parameter(Mandatory)][scriptblock]$Body
    )

    $logPath = Join-Path $logDir "$LogName.log"
    $global:LASTEXITCODE = 0
    & $Body *>&1 | Tee-Object -FilePath $logPath | Out-Null
    return $LASTEXITCODE
}

function Test-Command {
    param([Parameter(Mandatory)][string]$Name)
    $null = Get-Command $Name -ErrorAction SilentlyContinue
    return $?
}

# ---------------------------------------------------------------------------
# Gate definitions, ordered to fail fast on cheap gates
# ---------------------------------------------------------------------------

$gates = @(
    @{
        Name = 'toolchain'
        Desc = 'Report toolchain versions'
        Slow = $false
        Run  = {
            Invoke-Gate -LogName 'toolchain' -Body {
                cargo --version
                rustc --version
                node --version
                npm --version
                git --version
            }
        }
    }
    @{
        Name = 'npm-install'
        Desc = 'npm ci (root and conformance)'
        Slow = $false
        Run  = {
            $code = Invoke-Gate -LogName 'npm-install' -Body { npm ci }
            if ($code -ne 0) { return $code }
            return Invoke-Gate -LogName 'npm-install-conformance' -Body { npm ci --prefix conformance }
        }
    }
    @{
        Name = 'clippy'
        Desc = 'cargo clippy --workspace --all-targets --all-features -- -D warnings'
        Slow = $false
        Run  = {
            Invoke-Gate -LogName 'clippy' -Body {
                cargo clippy --workspace --all-targets --all-features -- -D warnings
            }
        }
    }
    @{
        Name = 'build'
        Desc = 'cargo build --workspace --all-targets --all-features'
        Slow = $false
        Run  = {
            Invoke-Gate -LogName 'build' -Body {
                cargo build --workspace --all-targets --all-features
            }
        }
    }
    @{
        Name = 'test'
        Desc = 'cargo test --workspace --all-features'
        Slow = $false
        Run  = {
            Invoke-Gate -LogName 'test' -Body { cargo test --workspace --all-features }
        }
    }
    @{
        Name = 'feature-combos'
        Desc = 'cargo test for each published feature combination'
        Slow = $true
        Run  = {
            # --all-features alone cannot catch breakage in code gated behind a single flag,
            # and the four combinations below are exactly the four published schema artifacts.
            $combos = @(
                @{ Label = 'default (stable v1)'; Args = @() }
                @{ Label = 'unstable'; Args = @('--features', 'unstable') }
                @{ Label = 'unstable_protocol_v2'; Args = @('--features', 'unstable_protocol_v2') }
                @{ Label = 'unstable + v2'; Args = @('--features', 'unstable,unstable_protocol_v2') }
            )
            $worst = 0
            foreach ($combo in $combos) {
                $label = $combo.Label
                $slug = ($label -replace '[^a-zA-Z0-9]+', '-').Trim('-')
                $code = Invoke-Gate -LogName "feature-$slug" -Body {
                    cargo test -p agent-client-protocol-schema @($combo.Args)
                }
                if ($code -eq 0) {
                    Write-Host "      ok   $label" -ForegroundColor DarkGray
                }
                else {
                    Write-Host "      FAIL $label" -ForegroundColor Red
                    $worst = $code
                }
            }
            return $worst
        }
    }
    @{
        Name = 'generated-artifacts'
        Desc = 'npm run generate, then assert the tree is unchanged'
        Slow = $false
        Run  = {
            # CI runs this on a pristine checkout, so it can simply assert the whole tree is
            # clean. Locally a developer usually has unrelated edits in flight, so compare
            # the dirty set before and after instead: only files the generate run itself
            # touched count as drift. Note that `npm run generate` ends in `npm run format`,
            # which can rewrite any file, so this cannot be scoped to schema/ and docs/ alone.
            $before = @(& git status --porcelain) | ForEach-Object { $_.Substring(3) }

            $code = Invoke-Gate -LogName 'generate' -Body { npm run generate }
            if ($code -ne 0) { return $code }

            $after = @(& git status --porcelain) | ForEach-Object { $_.Substring(3) }
            $drifted = @($after | Where-Object { $before -notcontains $_ })

            if ($drifted.Count -eq 0) { return 0 }

            Write-Host ''
            Write-Host '      Generated files are out of date:' -ForegroundColor Yellow
            foreach ($f in $drifted) { Write-Host "        $f" }
            Write-Host ''
            Write-Host "      Run 'npm run generate' and commit the result." -ForegroundColor Yellow
            if (-not $KeepGenerated) {
                foreach ($f in $drifted) {
                    & git checkout -- $f 2>&1 | Out-Null
                }
                Write-Host '      (restored those files; pass -KeepGenerated to inspect)' -ForegroundColor DarkGray
            }
            return 1
        }
    }
    @{
        Name = 'format'
        Desc = 'prettier --check and cargo fmt --check'
        Slow = $false
        Run  = {
            # Uses the npm script so the lockfile-pinned prettier runs. A bare
            # `npm exec prettier` resolves a different major version and reports
            # unrelated failures.
            Invoke-Gate -LogName 'format' -Body { npm run format:check }
        }
    }
    @{
        Name = 'spellcheck'
        Desc = 'npm run spellcheck'
        Slow = $false
        Run  = { Invoke-Gate -LogName 'spellcheck' -Body { npm run spellcheck } }
    }
    @{
        Name = 'conformance'
        Desc = 'ACP conformance suite (positive)'
        Slow = $false
        Run  = { Invoke-Gate -LogName 'conformance' -Body { npm run test:conformance } }
    }
    @{
        Name = 'conformance-negative'
        Desc = 'ACP conformance suite (negative and fault injection)'
        Slow = $false
        Run  = {
            # Asserts the harness detects non-conformance. Without this, a harness that
            # passes everything is indistinguishable from a correct implementation.
            Invoke-Gate -LogName 'conformance-negative' -Body { npm run test:conformance:negative }
        }
    }
    @{
        Name = 'registry-generator'
        Desc = 'Registry docs generator offline smoke test'
        Slow = $false
        Run  = {
            $test = Join-Path $repoRoot 'scripts' 'test_generate_registry_docs.py'
            if (-not (Test-Path $test)) {
                Write-Host '      skipped: generator test not present' -ForegroundColor DarkGray
                return 0
            }
            if (-not (Test-Command 'python')) {
                Write-Host '      skipped: python not on PATH' -ForegroundColor DarkGray
                return 0
            }
            Invoke-Gate -LogName 'registry-generator' -Body { python $test }
        }
    }
    @{
        Name = 'docs-rs'
        Desc = 'docs.rs documentation build (nightly)'
        Slow = $false
        Run  = {
            # Must match CI: nightly, --cfg docsrs, and no -D warnings. The crate enables
            # a nightly `#![feature]` under the docsrs cfg, so stable fails with E0554.
            $installed = (& rustup toolchain list 2>$null) -join "`n"
            if ($installed -notmatch 'nightly') {
                Write-Host '      skipped: nightly not installed (rustup toolchain install nightly)' -ForegroundColor DarkGray
                return 0
            }
            Invoke-Gate -LogName 'docs-rs' -Body {
                $env:RUSTDOCFLAGS = '--cfg docsrs'
                cargo +nightly doc -p agent-client-protocol-schema --all-features --no-deps
            }
        }
    }
    @{
        Name = 'msrv'
        Desc = 'Check against the minimum supported Rust version'
        Slow = $true
        Run  = {
            # CI reads rust-version from the crate manifest, not the workspace root.
            $manifestPath = Join-Path $repoRoot 'agent-client-protocol-schema' 'Cargo.toml'
            if (-not (Test-Path $manifestPath)) {
                Write-Host '      skipped: crate manifest not found' -ForegroundColor DarkGray
                return 0
            }
            $manifest = Get-Content $manifestPath -Raw
            if ($manifest -notmatch '(?m)^rust-version\s*=\s*"([^"]+)"') {
                Write-Host '      skipped: no rust-version in the crate manifest' -ForegroundColor DarkGray
                return 0
            }
            $msrv = $Matches[1]
            $installed = (& rustup toolchain list 2>$null) -join "`n"
            if ($installed -notmatch [regex]::Escape($msrv)) {
                Write-Host "      skipped: toolchain $msrv not installed (rustup toolchain install $msrv)" -ForegroundColor DarkGray
                return 0
            }
            Write-Host "      MSRV $msrv" -ForegroundColor DarkGray
            Invoke-Gate -LogName 'msrv' -Body {
                cargo "+$msrv" check --all-targets --all-features --locked
            }
        }
    }
    @{
        Name = 'deny'
        Desc = 'cargo-deny supply chain audit'
        Slow = $false
        Run  = {
            if (-not (Test-Command 'cargo-deny')) {
                Write-Host '      skipped: cargo-deny not installed (cargo install cargo-deny --locked)' -ForegroundColor DarkGray
                return 0
            }
            Invoke-Gate -LogName 'deny' -Body { cargo deny check }
        }
    }
    @{
        Name = 'typos'
        Desc = 'typos-cli spell check'
        Slow = $false
        Run  = {
            if (-not (Test-Command 'typos')) {
                Write-Host '      skipped: typos not installed (cargo install typos-cli --locked)' -ForegroundColor DarkGray
                return 0
            }
            Invoke-Gate -LogName 'typos' -Body { typos }
        }
    }
)

# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

function Test-Match {
    param([string]$Name, [string[]]$Patterns)
    foreach ($p in $Patterns) {
        if ($Name -like "*$p*") { return $true }
    }
    return $false
}

# When the script is launched as `pwsh -File ... -Only a,b`, PowerShell passes the argument
# through as the single literal string 'a,b' rather than parsing the comma operator, so the
# filter would silently match nothing. Splitting here makes both invocation styles behave
# the same, including `npm run ci:local -- -Only a,b`.
function Expand-Patterns {
    param([string[]]$Patterns)
    if (-not $Patterns) { return @() }
    return @($Patterns |
        ForEach-Object { $_ -split ',' } |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ })
}

$Only = Expand-Patterns -Patterns $Only
$Skip = Expand-Patterns -Patterns $Skip

$selected = $gates | Where-Object {
    $keep = $true
    if ($Only) { $keep = Test-Match -Name $_.Name -Patterns $Only }
    if ($keep -and $Skip) { $keep = -not (Test-Match -Name $_.Name -Patterns $Skip) }
    if ($keep -and $SkipSlow -and $_.Slow) { $keep = $false }
    $keep
}

if ($List) {
    Write-Host ''
    Write-Host 'Gates:' -ForegroundColor Cyan
    foreach ($g in $gates) {
        $tag = if ($g.Slow) { ' [slow]' } else { '' }
        Write-Host ("  {0,-22} {1}{2}" -f $g.Name, $g.Desc, $tag)
    }
    Write-Host ''
    exit 0
}

if (-not $selected) {
    Write-Error 'No gates matched the given -Only/-Skip filters. Use -List to see gate names.'
    exit 2
}

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

Write-Host ''
Write-Host 'ACP local CI' -ForegroundColor Cyan
Write-Host "  repo: $repoRoot"
Write-Host "  logs: $logDir"
Write-Host "  gates: $($selected.Count) of $($gates.Count)"
Write-Host ''

$results = [System.Collections.Generic.List[object]]::new()
$overall = 0

foreach ($gate in $selected) {
    Write-Host ("  {0,-22} {1}" -f $gate.Name, $gate.Desc)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
        $code = & $gate.Run
    }
    catch {
        Write-Host "      exception: $($_.Exception.Message)" -ForegroundColor Red
        $code = 1
    }
    $sw.Stop()

    # A gate body may emit output as well as its return value; take the last integer.
    if ($code -is [array]) { $code = @($code | Where-Object { $_ -is [int] })[-1] }
    if ($null -eq $code) { $code = 0 }

    $ok = ($code -eq 0)
    if (-not $ok) { $overall = 1 }

    $results.Add([pscustomobject]@{
            Gate    = $gate.Name
            Result  = if ($ok) { 'PASS' } else { 'FAIL' }
            Exit    = $code
            Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        })

    if ($ok) {
        Write-Host ("      PASS  {0}s" -f [math]::Round($sw.Elapsed.TotalSeconds, 1)) -ForegroundColor Green
    }
    else {
        Write-Host ("      FAIL  exit {0}  ({1}s)  log: .ci-local/{2}.log" -f $code, [math]::Round($sw.Elapsed.TotalSeconds, 1), $gate.Name) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'Summary' -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | ForEach-Object { $_.TrimEnd() } | Write-Host

$failed = @($results | Where-Object { $_.Result -eq 'FAIL' })
Write-Host ''
if ($overall -eq 0) {
    Write-Host ("All {0} gates passed." -f $results.Count) -ForegroundColor Green
}
else {
    Write-Host ("{0} of {1} gates failed: {2}" -f $failed.Count, $results.Count, ($failed.Gate -join ', ')) -ForegroundColor Red
    Write-Host "Logs are in $logDir"
}
Write-Host ''

exit $overall
