@echo off
rem Daily reset of every testbed lane marked autoReset in lanes.json (2 to 6; registered by register-lane-reset.ps1),
rem then the nightly full gate run (B3084): every gate in the gate map, split across those lanes (B4103).
rem Busy lanes are skipped. Lane 1 and the Live world are never touched. The PC job runner is started if it is not
rem running (tools\pcq\start-runner.ps1), so a reboot brings it back by the next morning at the latest.
cd /d "%~dp0..\.."
set LOG=%LOCALAPPDATA%\FoundryVTT\lane-reset.log
echo ==== %DATE% %TIME% >> "%LOG%"
for /f "delims=" %%L in ('node tools\lanes\lanes.mjs auto-lanes') do for %%N in (%%L) do node tools\lanes\lanes.mjs reset --lane %%N --if-free >> "%LOG%" 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -File tools\pcq\start-runner.ps1 >> "%LOG%" 2>&1
rem The last line pulls main, so it must be the last line, and exit runs before cmd reads this file again.
node tools\lanes\nightly.mjs >> "%LOG%" 2>&1 & exit /b
