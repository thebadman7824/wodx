# Keeps the PC job runner going (B4100-B4109): updates its own clone to main, runs runner.mjs, and starts it again
# after an update (exit 75) or a crash. Put a file named runner-off in D:\WoDX\pcq to stop it once it is idle.
# Started by start-runner.ps1, never by hand in a window that may close.
$ErrorActionPreference = 'Continue'
$base = 'D:\WoDX\pcq'; $repo = "$base\repo"; $logs = "$base\logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
while ($true) {
  if (Test-Path "$base\runner-off") { "$(Get-Date -Format o) runner-off found; stopping" | Add-Content "$logs\runner-console.log"; break }
  git -C $repo fetch -q origin 2>&1 | Out-Null
  git -C $repo checkout -q -f --detach origin/main 2>&1 | Out-Null
  if (-not (Test-Path "$repo\tools\harness\node_modules\playwright")) {
    Push-Location "$repo\tools\harness"; npm install --no-audit --no-fund 2>&1 | Add-Content "$logs\runner-console.log"; Pop-Location
  }
  # Logs older than 14 days go, so the runner never fills the drive.
  Get-ChildItem $logs -File | ? { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } | Remove-Item -Force -EA SilentlyContinue
  & node "$repo\tools\pcq\runner.mjs" *>> "$logs\runner-console.log"
  $code = $LASTEXITCODE
  "$(Get-Date -Format o) runner exit $code" | Add-Content "$logs\runner-console.log"
  if ($code -eq 75) { continue }
  if ($code -eq 2) { Start-Sleep 600 } else { Start-Sleep 30 }
}
