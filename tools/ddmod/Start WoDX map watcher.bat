@echo off
rem Watches D:\WoDX\maps for Dungeondraft exports and makes the scenes in rothenstein-wodx. Close this window to stop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wodx-watch.ps1" %*
