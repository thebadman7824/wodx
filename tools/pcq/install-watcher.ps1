# Installs the PC watcher on this PC (the laptop, DESKTOP-S6NV3Q9): copies run-watcher.ps1 and watcher.mjs into the
# runner's home and registers the scheduled task "WoDX PC watcher at logon" for the signed-in user. The task starts at
# sign-in (autologon brings it back after a reboot), repeats every 30 minutes so a dead loop comes back (a second
# copy leaves at once), runs below normal priority, on battery too, with no time limit. Safe to run again.
#   powershell -ExecutionPolicy Bypass -File tools\pcq\install-watcher.ps1 [-Start]
param([switch]$Start)
$base = if (Test-Path 'D:\WoDX\pcq') { 'D:\WoDX\pcq' } elseif ($env:WODX_PCQ_HOME) { $env:WODX_PCQ_HOME } else { 'C:\WoDX\pcq' }
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force "$base\watcher", "$base\logs" | Out-Null
Copy-Item "$here\run-watcher.ps1" "$base\run-watcher.ps1" -Force
Copy-Item "$here\watcher.mjs" "$base\watcher\watcher.mjs" -Force
$name = 'WoDX PC watcher at logon'
$user = "$env:USERDOMAIN\$env:USERNAME"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$base\run-watcher.ps1`"" -WorkingDirectory $base
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$repeat = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 30)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5) -Priority 7
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger @($logon, $repeat) -Settings $settings -Principal $principal -Force | Out-Null
"Registered '$name' for $user."
if ($Start) { Start-ScheduledTask -TaskName $name; "Started." }
