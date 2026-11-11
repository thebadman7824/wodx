<#
WoDX map watcher: takes Dungeondraft's Universal VTT exports into Foundry (rothenstein-wodx only).

Every few seconds it looks under -Maps for .dd2vtt files that are new or newer than last time. For each one it makes
Data\wodx-maps\<map>\<stamp>\ with the export, its picture (taken out of the export) and the map's WoDX file when there
is one. Then it runs mapimport.mjs through the headless runner, which joins rothenstein-wodx as Gamemaster Test and
makes one scene per new folder (walls, doors, lights, then Adopt). Nothing is deleted or overwritten.

Start it with "Start WoDX map watcher.bat", or:
  powershell -ExecutionPolicy Bypass -File wodx-watch.ps1 [-Maps D:\WoDX\maps] [-Once]
The Foundry server must be running with rothenstein-wodx; if it is not, the exports wait and are tried again.
#>
param(
  [string]$Maps = "D:\WoDX\maps",
  [string]$Data = "$env:LOCALAPPDATA\FoundryVTT\Data",
  [string]$Runner = "",
  [string]$Foundry = "https://localhost:30000",
  [int]$Every = 5,
  [switch]$Once
)
$ErrorActionPreference = "Stop"
# The runner kept beside the watcher comes first; %TEMP% can be cleaned out
if (-not $Runner) {
  $Runner = @((Join-Path $PSScriptRoot "runner\headless-gates.local.mjs"), "$env:TEMP\wodx-main-0953\tools\harness\headless-gates.local.mjs") |
    Where-Object { Test-Path $_ } | Select-Object -First 1
}
try { (Get-Process -Id $PID).PriorityClass = "BelowNormal" } catch {}
$seenFile = Join-Path $PSScriptRoot "wodx-watch-seen.json"
$logFile = Join-Path $PSScriptRoot "wodx-watch.log"
$gateSrc = Join-Path $PSScriptRoot "mapimport.mjs"
if (-not (Test-Path $gateSrc)) { $gateSrc = Join-Path $PSScriptRoot "..\gate\mapimport.mjs" }

function Log($m) { $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m; Write-Host $line; Add-Content -Path $logFile -Value $line -Encoding UTF8 }
function Slug($s) { (($s -replace '[^A-Za-z0-9._-]+', '-').Trim('-')).ToLower() }
function LoadSeen { if (Test-Path $seenFile) { $h = @{}; (Get-Content $seenFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value }; $h } else { @{} } }
function SaveSeen($h) { [IO.File]::WriteAllText($seenFile, ($h | ConvertTo-Json), (New-Object Text.UTF8Encoding $false)) }

# An export still being written changes size; take it only when two looks a second apart agree
function Settled($f) { $a = (Get-Item $f).Length; Start-Sleep -Seconds 1; $b = (Get-Item $f).Length; return ($a -gt 0 -and $a -eq $b) }

function Stage($vtt) {
  $base = [IO.Path]::GetFileNameWithoutExtension($vtt.Name)
  $slug = Slug $base
  $stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
  $dir = Join-Path $Data "wodx-maps\$slug\$stamp"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  Copy-Item $vtt.FullName (Join-Path $dir "$slug.dd2vtt")
  # Windows PowerShell 5 cannot parse JSON this large, so the picture is read straight out of the text
  $m = [regex]::Match([IO.File]::ReadAllText($vtt.FullName), '"image"\s*:\s*"([^"]+)"')
  if (-not $m.Success) { throw "$($vtt.Name) has no picture in it" }
  [IO.File]::WriteAllBytes((Join-Path $dir "$slug.png"), [Convert]::FromBase64String(($m.Groups[1].Value -replace '\\/', '/')))
  $side = Join-Path $vtt.DirectoryName "$base.wodx.json"
  if (Test-Path $side) { Copy-Item $side (Join-Path $dir "$slug.wodx.json") }
  Log "staged $($vtt.Name) -> wodx-maps\$slug\$stamp$(if (Test-Path $side) { ' (with WoDX file)' } else { ' (no WoDX file)' })"
}

# The runner joins whichever world is running, so ask Foundry first and go on only for the testbed
function TestbedUp {
  # Windows PowerShell 5 cannot finish the TLS handshake with Foundry's own certificate; curl.exe (in Windows) can
  try {
    $s = (& curl.exe -sk --max-time 10 "$Foundry/api/status") | ConvertFrom-Json
    if (-not $s) { throw "no answer" }
  } catch { Log "Foundry is not answering at $Foundry; trying again later"; return $false }
  if ($s.world -ne "rothenstein-wodx") { Log "Foundry is running '$($s.world)', not rothenstein-wodx; waiting"; return $false }
  return $true
}

function Import {
  if (-not (TestbedUp)) { return $false }
  $gateDir = Join-Path $Data "wodx-gate"
  New-Item -ItemType Directory -Force -Path $gateDir | Out-Null
  Copy-Item $gateSrc (Join-Path $gateDir "mapimport.mjs") -Force
  $result = Join-Path $gateDir "mapimport-result.json"
  $before = if (Test-Path $result) { (Get-Item $result).LastWriteTimeUtc } else { [datetime]::MinValue }
  if (-not $Runner -or -not (Test-Path $Runner)) { Log "the headless runner is missing: $Runner"; return $false }
  Push-Location (Split-Path $Runner)
  try { & node $Runner mapimport 2>&1 | ForEach-Object { Add-Content -Path $logFile -Value "    $_" -Encoding UTF8 } } finally { Pop-Location }
  if ((Test-Path $result) -and (Get-Item $result).LastWriteTimeUtc -gt $before) {
    $r = Get-Content $result -Raw | ConvertFrom-Json
    foreach ($m in $r.imported) { Log "scene made: $($m.scene) ($($m.walls) walls, $($m.doors) doors, $($m.lights) lights)" }
    foreach ($m in $r.failed) { Log "failed: $($m.dir): $($m.error)" }
    foreach ($e in $r.errors) { Log "stopped: $e" }
    return ($r.errors.Count -eq 0)
  }
  Log "Foundry did not answer (is the server running with rothenstein-wodx?); trying again later"
  return $false
}

Log "watching $Maps"
$waiting = $true          # one sweep at start, for exports staged while Foundry was not running
$nextTry = Get-Date
while ($true) {
  $seen = LoadSeen
  $new = @()
  foreach ($f in Get-ChildItem -Path $Maps -Recurse -Filter *.dd2vtt -File -ErrorAction SilentlyContinue) {
    $key = $f.FullName.ToLower(); $t = $f.LastWriteTimeUtc.ToString("o")
    if ($seen[$key] -ne $t -and (Settled $f.FullName)) { $new += $f }
  }
  foreach ($f in $new) {
    try { Stage $f; $seen[$f.FullName.ToLower()] = $f.LastWriteTimeUtc.ToString("o"); $waiting = $true }
    catch { Log "could not take $($f.Name): $($_.Exception.Message)" }
  }
  if ($new.Count) { SaveSeen $seen }
  if ($new.Count) { $nextTry = Get-Date }
  if ($waiting -and (Get-Date) -ge $nextTry) {
    if (Import) { $waiting = $false } else { $nextTry = (Get-Date).AddMinutes(2) }
  }
  if ($Once) { break }
  Start-Sleep -Seconds $Every
}
