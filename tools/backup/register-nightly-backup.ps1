<#
  Registers the WoDX nightly copy as a Windows scheduled task for the current user, every day at 04:30,
  or at the next start-up if the PC was off. Run it once:

    powershell -ExecutionPolicy Bypass -File register-nightly-backup.ps1 -Destination "D:\OneDrive\WoDX backups"

  To remove it: Unregister-ScheduledTask -TaskName "WoDX nightly copy"
#>
param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$At = "04:30"
)
$script = Join-Path $PSScriptRoot "nightly-backup.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`" -Destination `"$Destination`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -Priority 7 -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "WoDX nightly copy" -Action $action -Trigger $trigger -Settings $settings -Description "Zips the Foundry worlds and WoDX files and copies them off the PC" -Force | Out-Null
Write-Output "Registered: WoDX nightly copy, daily at $At, to $Destination"
