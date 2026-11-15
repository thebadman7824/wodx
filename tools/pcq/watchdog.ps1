# Brings the PC job runner back when it dies (B5210-B5212). start-runner.ps1 starts this through WMI, apart from the
# runner, so a kill that ends the runner's whole process tree leaves the watchdog running. Every two minutes it looks
# for run-runner.ps1 and, when it is gone and no runner-off file is set, starts it again with start-runner.ps1.
# GitHub runs the pc-heartbeat schedule only now and then, so this is the check that brings the runner back.
$ErrorActionPreference = 'Continue'
$base = 'D:\WoDX\pcq'; $logs = "$base\logs"
while ($true) {
  Start-Sleep 120
  if (Test-Path "$base\watchdog-off") { "$(Get-Date -Format o) watchdog-off found; watchdog stopping" | Add-Content "$logs\runner-console.log"; break }
  if (Test-Path "$base\runner-off") { continue }
  $running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ? { $_.CommandLine -like '*-File D:\WoDX\pcq\run-runner.ps1*' }
  if ($running) { continue }
  "$(Get-Date -Format o) watchdog: the runner is not running; starting it again" | Add-Content "$logs\runner-console.log"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$base\start-runner.ps1" 2>&1 | Add-Content "$logs\runner-console.log"
}
