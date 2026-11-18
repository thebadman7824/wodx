@echo off
rem Daily reset of every testbed lane marked autoReset in lanes.json (2 to 6; registered by register-lane-reset.ps1).
rem It no longer starts tools\lanes\nightly.mjs (B7460): the one nightly full run is tools\pcq\nightly-gates.mjs, an
rem all-gates PC job (registry\priorities.json, nightly).
rem Busy lanes are skipped. Lane 1 and the Live world are never touched. The PC job runner is started if it is not
rem running (tools\pcq\start-runner.ps1), so a reboot brings it back by the next morning at the latest.
cd /d "%~dp0..\.."
set LOG=%LOCALAPPDATA%\FoundryVTT\lane-reset.log
echo ==== %DATE% %TIME% >> "%LOG%"
for /f "delims=" %%L in ('node tools\lanes\lanes.mjs auto-lanes') do for %%N in (%%L) do node tools\lanes\lanes.mjs reset --lane %%N --if-free >> "%LOG%" 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -File tools\pcq\start-runner.ps1 >> "%LOG%" 2>&1
exit /b
