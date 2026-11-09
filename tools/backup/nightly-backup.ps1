<#
  WoDX nightly copy: zips the Foundry worlds, the WoDX modules and system, the in-Foundry backups
  (Data\wodx-backups) and the newest wodx git bundle, then copies the zip to a folder off this PC
  (a synced cloud folder such as OneDrive, or a network share). Keeps the newest -Keep zips there.

    powershell -ExecutionPolicy Bypass -File nightly-backup.ps1 -Destination "D:\OneDrive\WoDX backups"

  It runs at below-normal priority. Foundry may be running: the world databases are copied with
  robocopy, which reads files that are open, and LevelDB's LOCK files are left out.
  Nothing is ever deleted except older nightly zips in -Destination beyond -Keep.
#>
param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$FoundryRoot = (Join-Path $env:LOCALAPPDATA "FoundryVTT"),
  [int]$Keep = 14
)
$ErrorActionPreference = "Stop"
try { (Get-Process -Id $PID).PriorityClass = "BelowNormal" } catch { }

$data = Join-Path $FoundryRoot "Data"
$repo = Join-Path $FoundryRoot "wodx-repo"
if ( -not (Test-Path $data) ) { throw "No Foundry Data folder at $data" }
if ( -not (Test-Path $Destination) ) { New-Item -ItemType Directory -Path $Destination | Out-Null }

$stamp = Get-Date -Format "yyyy-MM-dd"
$stage = Join-Path $env:TEMP "wodx-nightly-$stamp"
if ( Test-Path $stage ) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null

function Copy-Tree($from, $to) {
  if ( -not (Test-Path $from) ) { return }
  # /E all subfolders, /R:1 /W:1 one quick retry, /XF LOCK leaves out LevelDB lock files; exit codes under 8 are success
  robocopy $from $to /E /R:1 /W:1 /XF LOCK /NFL /NDL /NJH /NJS /NP | Out-Null
  if ( $LASTEXITCODE -ge 8 ) { throw "robocopy failed ($LASTEXITCODE) on $from" }
}

Copy-Tree (Join-Path $data "worlds") (Join-Path $stage "worlds")
Get-ChildItem (Join-Path $data "modules") -Directory -Filter "wodx-*" | ForEach-Object {
  Copy-Tree $_.FullName (Join-Path $stage "modules\$($_.Name)")
}
Copy-Tree (Join-Path $data "systems\worldofdarkness") (Join-Path $stage "systems\worldofdarkness")
Copy-Tree (Join-Path $data "wodx-backups") (Join-Path $stage "wodx-backups")
$bundle = Get-ChildItem $repo -Filter "wodx-*.bundle" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ( $bundle ) { Copy-Item $bundle.FullName (Join-Path $stage $bundle.Name) }

$zip = Join-Path $env:TEMP "wodx-nightly-$stamp.zip"
if ( Test-Path $zip ) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal
$target = Join-Path $Destination "wodx-nightly-$stamp.zip"
Copy-Item $zip $target -Force
if ( (Get-Item $target).Length -ne (Get-Item $zip).Length ) { throw "The copy at $target is not the same size as the zip" }
Remove-Item -Recurse -Force $stage
Remove-Item -Force $zip

# Keep the newest $Keep nightly zips at the destination
Get-ChildItem $Destination -Filter "wodx-nightly-*.zip" | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Force

$line = "{0}  {1}  {2:N1} MB" -f (Get-Date -Format s), $target, ((Get-Item $target).Length / 1MB)
Add-Content -Path (Join-Path $FoundryRoot "Backups\wodx-nightly.log") -Value $line -ErrorAction SilentlyContinue
Write-Output $line
