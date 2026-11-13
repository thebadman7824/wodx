@echo off
rem Daily reset of testbed lanes 2 and 3 from the known-good world copy (registered by register-lane-reset.ps1).
rem Busy lanes are skipped. Lane 1 and the Live world are never touched.
cd /d "%~dp0..\.."
set LOG=%LOCALAPPDATA%\FoundryVTT\lane-reset.log
echo ==== %DATE% %TIME% >> "%LOG%"
node tools\lanes\lanes.mjs reset --lane 2 --if-free >> "%LOG%" 2>&1
node tools\lanes\lanes.mjs reset --lane 3 --if-free >> "%LOG%" 2>&1
