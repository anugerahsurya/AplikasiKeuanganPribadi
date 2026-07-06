@echo off
REM =========================================
REM  Buat Shortcut Ituang di Desktop
REM =========================================
echo Membuat shortcut Ituang di Desktop...

set "EXE_PATH=%~dp0dist\win-unpacked\Ituang.exe"
set "SHORTCUT=%USERPROFILE%\Desktop\Ituang - Manajemen Keuangan.lnk"

powershell -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut('%SHORTCUT%'); ^
   $s.TargetPath = '%EXE_PATH%'; ^
   $s.WorkingDirectory = '%~dp0dist\win-unpacked'; ^
   $s.IconLocation = '%EXE_PATH%'; ^
   $s.Description = 'Ituang - Aplikasi Manajemen Keuangan'; ^
   $s.Save()"

if exist "%SHORTCUT%" (
  echo Shortcut berhasil dibuat di Desktop!
) else (
  echo Gagal membuat shortcut. Pastikan build sudah selesai.
)
pause
