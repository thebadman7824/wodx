<#
  Registers a daily Windows task that resets testbed lanes 2 and 3 from the shared known-good world copy.
  Each reset backs the lane's world up first, skips a lane that is busy with a gate run, and never touches lane 1
  (the testbed Ben plays in) or the Live world.

    powershell -ExecutionPolicy Bypass -File register-lane-reset.ps1 -Repo "C:\path\to\wodx" [-At "04:40"]

  -Repo is a clone kept up to date with main (the reset uses its tools/lanes and lanes.json).
  Remove the task with: schtasks /Delete /TN "WoDX lane reset" /F
#>
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$At = "04:40"
)
$ErrorActionPreference = "Stop"
$wrapper = Join-Path $Repo "tools\lanes\lane-reset.cmd"
if ( -not (Test-Path $wrapper) ) { throw "No tools\lanes\lane-reset.cmd under $Repo" }
schtasks /Create /TN "WoDX lane reset" /TR "`"$wrapper`"" /SC DAILY /ST $At /F | Out-Null
Write-Output "Registered 'WoDX lane reset' daily at $At. Log: $env:LOCALAPPDATA\FoundryVTT\lane-reset.log"
