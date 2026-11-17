# Keeps the PC job runner going (B4100-B4109): updates its own clone to main, runs runner.mjs, and starts it again
# after an update (exit 75) or a crash. Put a file named runner-off in D:\WoDX\pcq to stop it once it is idle.
# Started by start-runner.ps1, never by hand in a window that may close.
$ErrorActionPreference = 'Continue'
# B6880: the second PC has no D: drive; its runner lives in C:\WoDX\pcq.
$base = if (Test-Path 'D:\WoDX\pcq') { 'D:\WoDX\pcq' } elseif ($env:WODX_PCQ_HOME) { $env:WODX_PCQ_HOME } else { 'C:\WoDX\pcq' }; $repo = "$base\repo"; $logs = "$base\logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
# B7021: a PC whose runner.<host>.json sets "priority" (the Secondary PC: BelowNormal) runs the runner, and every gate,
# Foundry and browser it starts, at that priority, so other work on the PC (the book OCR) keeps the CPU.
$hostConf = "$repo\tools\pcq\runner.$($env:COMPUTERNAME.ToLower()).json"
if (Test-Path $hostConf) { try { $pr = (Get-Content -Raw $hostConf | ConvertFrom-Json).priority; if ($pr) { (Get-Process -Id $PID).PriorityClass = $pr } } catch {} }
while ($true) {
  if (Test-Path "$base\runner-off") { "$(Get-Date -Format o) runner-off found; stopping" | Add-Content "$logs\runner-console.log"; break }
  git -C $repo fetch -q origin 2>&1 | Out-Null
  git -C $repo checkout -q -f --detach origin/main 2>&1 | Out-Null
  if (-not (Test-Path "$repo\tools\harness\node_modules\playwright")) {
    Push-Location "$repo\tools\harness"; npm install --no-audit --no-fund 2>&1 | Add-Content "$logs\runner-console.log"; Pop-Location
  }
  # Logs older than 14 days go, so the runner never fills the drive.
  Get-ChildItem $logs -File | ? { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | Remove-Item -Force -EA SilentlyContinue
  # B5211: the watchdog runs apart from this script; start-runner.ps1 starts it when it is missing.
  if (Test-Path "$repo\tools\pcq\start-runner.ps1") { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$repo\tools\pcq\start-runner.ps1" 2>&1 | Out-Null }
  & node "$repo\tools\pcq\runner.mjs" *>> "$logs\runner-console.log"
  $code = $LASTEXITCODE
  "$(Get-Date -Format o) runner exit $code" | Add-Content "$logs\runner-console.log"
  if ($code -eq 75) { continue }
  if ($code -eq 2) { Start-Sleep 600 } else { Start-Sleep 30 }
}
