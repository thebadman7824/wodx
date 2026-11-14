# Starts the PC job runner if it is not running (B4100-B4109). Safe to run any time: lane-reset.cmd runs it every
# night, so the runner comes back after a reboot. The first time it clones the repository into D:\WoDX\pcq\repo.
# The runner is started through WMI so it does not belong to whatever started this script, at below-normal priority.
$base = 'D:\WoDX\pcq'; $repo = "$base\repo"
New-Item -ItemType Directory -Force "$base\logs" | Out-Null
$running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | ? { $_.CommandLine -like '*-File D:\WoDX\pcq\run-runner.ps1*' }
if ($running) { "PC runner already running (process $($running[0].ProcessId))."; exit 0 }
if (-not (Test-Path "$repo\.git")) {
  git clone -q https://github.com/thebadman7824/wodx.git $repo
  if ($LASTEXITCODE) { "Clone failed."; exit 1 }
}
git -C $repo fetch -q origin; git -C $repo checkout -q -f --detach origin/main
Copy-Item "$repo\tools\pcq\run-runner.ps1" "$base\run-runner.ps1" -Force
$r = Invoke-CimMethod Win32_Process -MethodName Create -Arguments @{CommandLine = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $base\run-runner.ps1"; CurrentDirectory = $base}
if ($r.ReturnValue -ne 0) { "Could not start the runner (WMI $($r.ReturnValue))."; exit 1 }
Start-Sleep 2
try { (Get-Process -Id $r.ProcessId).PriorityClass = 'BelowNormal' } catch {}
"PC runner started (process $($r.ProcessId)); log in $base\logs."
