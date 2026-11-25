# Play solo in one step (#2468): start the solo world, wait for it, then start the Storyteller's seat beside it.
# When the seat stops (its window is closed or Ctrl+C), the world stops too, so nothing is left running.
#
#   Play-Solo.bat                      double-click it (it runs this file with the defaults below)
#   powershell -ExecutionPolicy Bypass -File Play-Solo.ps1 [-SoloRoot D:\WoDX\FoundryData-solo] [-Repo D:\WoDX\rc-clean]
#                                       [-Port 30010] [-Reports D:\WoDX\reports\solo]
#
# SoloRoot holds Start-Solo.bat (which starts Foundry on the solo Data folder). Repo is the clean clone the build was
# deployed from; the seat runs from its tools\solo\seat.mjs. Log in as your player in the browser once it says ready.
param(
  [string]$SoloRoot = "D:\WoDX\FoundryData-solo",
  [string]$Repo = "D:\WoDX\rc-clean",
  [int]$Port = 30010,
  [string]$Reports = "D:\WoDX\reports\solo"
)
$ErrorActionPreference = "Stop"

function Test-Listening([int]$p) {
  foreach ( $h in @("127.0.0.1", "::1") ) {
    try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect($h, $p); $c.Close(); return $true } catch { }
  }
  return $false
}

$start = Join-Path $SoloRoot "Start-Solo.bat"
$seat = Join-Path $Repo "tools\solo\seat.mjs"
if ( -not (Test-Path $seat) ) { Write-Host "No seat at $seat. Pass -Repo with the clean clone's folder."; exit 1 }

$world = $null
if ( Test-Listening $Port ) {
  Write-Host "The solo world is already running on port $Port. Starting only the seat."
} else {
  if ( -not (Test-Path $start) ) { Write-Host "No Start-Solo.bat in $SoloRoot. Pass -SoloRoot."; exit 1 }
  Write-Host "Starting the solo world..."
  $world = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$start`"" -WorkingDirectory $SoloRoot -WindowStyle Minimized -PassThru
  $until = (Get-Date).AddSeconds(180)
  while ( -not (Test-Listening $Port) ) {
    if ( (Get-Date) -gt $until ) { Write-Host "The world did not open port $Port within 3 minutes."; exit 1 }
    Start-Sleep -Seconds 2
  }
  # Foundry answers before the world has loaded; give it a moment
  Start-Sleep -Seconds 10
}

New-Item -ItemType Directory -Force -Path $Reports | Out-Null
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
Write-Host "Starting the Storyteller's seat (a hidden browser signed in as the Storyteller)..."
$seatProc = Start-Process -FilePath "node" -ArgumentList "`"$seat`" --url https://localhost:$Port --reports `"$Reports`"" -WorkingDirectory $Repo -WindowStyle Minimized -PassThru
Write-Host ""
Write-Host "Ready. Open https://localhost:$Port in your browser and log in as your player (not as the Storyteller)."
Write-Host "Close the seat's window, or this one, to stop solo play."
try { Wait-Process -Id $seatProc.Id } finally {
  if ( $world -and -not $world.HasExited ) {
    Write-Host "The seat stopped, so the world stops too."
    & taskkill.exe /T /F /PID $world.Id | Out-Null
  }
}
