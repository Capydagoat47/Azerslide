@echo off
setlocal
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0Azerslide.ps1" -Gui
