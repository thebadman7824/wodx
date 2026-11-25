@echo off
rem Play solo in one step (#2468): the solo world and the Storyteller's seat together. See Play-Solo.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Play-Solo.ps1" %*
