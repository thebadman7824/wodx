@echo off
rem Daily reset of testbed lanes 2 and 3 from the known-good world copy (registered by register-lane-reset.ps1),
rem then the nightly full gate run (B3084): every gate in the gate map, split across lanes 2 and 3.
rem Busy lanes are skipped. Lane 1 and the Live world are never touched.
cd /d "%~dp0..\.."
set LOG=%LOCALAPPDATA%\FoundryVTT\lane-reset.log
echo ==== %DATE% %TIME% >> "%LOG%"
node tools\lanes\lanes.mjs reset --lane 2 --if-free >> "%LOG%" 2>&1
node tools\lanes\lanes.mjs reset --lane 3 --if-free >> "%LOG%" 2>&1
rem The last line pulls main, so it must be the last line, and exit runs before cmd reads this file again.
node tools\lanes\nightly.mjs >> "%LOG%" 2>&1 & exit /b
