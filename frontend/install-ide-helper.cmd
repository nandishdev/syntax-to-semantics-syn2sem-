@echo off
setlocal
set "INSTALLER=%TEMP%\Syn2Sem-IDE-Helper-Install.ps1"
set "INSTALLER_URL=https://syn2sem.vercel.app/ide-helper-install.ps1"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%INSTALLER_URL%' -OutFile '%INSTALLER%' -UseBasicParsing; & powershell.exe -NoProfile -ExecutionPolicy Bypass -File '%INSTALLER%'; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"
if errorlevel 1 (
    echo.
    echo The Syn2Sem IDE connector could not be installed. Read the message above and try again.
    pause
    exit /b 1
)

echo.
echo Setup complete. Return to Syn2Sem and click your chosen IDE logo.
pause
