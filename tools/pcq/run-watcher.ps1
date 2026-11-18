# Runs the PC watcher (watcher.mjs) every 5 minutes, below normal priority. Started at sign-in by the scheduled task
# "WoDX PC watcher at logon" (install-watcher.ps1), never by hand in a window that may close. Each cycle runs the
# runner clone's copy of watcher.mjs, which the runner keeps at main, and keeps a copy in the home for when that clone
# is missing. A file named watcher-off in the home stops it. It only looks and reports (watcher.mjs header).
$ErrorActionPreference = 'Continue'
$base = if (Test-Path 'D:\WoDX\pcq') { 'D:\WoDX\pcq' } elseif ($env:WODX_PCQ_HOME) { $env:WODX_PCQ_HOME } else { 'C:\WoDX\pcq' }
$logs = "$base\logs"; New-Item -ItemType Directory -Force $logs | Out-Null
try { (Get-Process -Id $PID).PriorityClass = 'BelowNormal' } catch {}
$node = (Get-Command node -EA SilentlyContinue).Source; if (-not $node) { $node = 'C:\Program Files\nodejs\node.exe' }
# One watcher at a time: a second start (the task's half-hourly repeat) leaves at once.
$mine = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ? { $_.CommandLine -like '*run-watcher.ps1*' -and $_.ProcessId -ne $PID }
if ($mine) { exit 0 }
"$(Get-Date -Format o) watcher loop started (process $PID)" | Add-Content "$logs\watcher-console.log"
while ($true) {
  if (Test-Path "$base\watcher-off") { "$(Get-Date -Format o) watcher-off found; stopping" | Add-Content "$logs\watcher-console.log"; break }
  $src = "$base\repo\tools\pcq\watcher.mjs"
  if (Test-Path $src) { New-Item -ItemType Directory -Force "$base\watcher" | Out-Null; Copy-Item $src "$base\watcher\watcher.mjs" -Force -EA SilentlyContinue }
  if (Test-Path "$base\watcher\watcher.mjs") { & cmd.exe /c "`"$node`" `"$base\watcher\watcher.mjs`" --once >> `"$logs\watcher-console.log`" 2>&1" }
  else { "$(Get-Date -Format o) no watcher.mjs yet" | Add-Content "$logs\watcher-console.log" }
  # Keep the console log small: past 2 MB, keep the last 2000 lines.
  if ((Get-Item "$logs\watcher-console.log").Length -gt 2MB) { $t = Get-Content "$logs\watcher-console.log" -Tail 2000; $t | Set-Content "$logs\watcher-console.log" }
  Start-Sleep 300
}
