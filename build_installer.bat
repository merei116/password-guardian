@echo off
cd /d "%~dp0installer"
pip install --quiet pyinstaller
pyinstaller --noconfirm installer.spec
if errorlevel 1 (
  echo ❌ PyInstaller failed
  pause
  exit /b 1
)
echo.
echo ✅ Installer created: %cd%\dist\PasswordGuardianInstaller.exe
pause
