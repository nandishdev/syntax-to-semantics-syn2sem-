[CmdletBinding()]
param(
    [string]$HelperUri = 'https://syn2sem.vercel.app/ide-companion.js',
    [string]$LocalHelperPath
)

$ErrorActionPreference = 'Stop'

function Test-IdeHelperReady {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:43127/health' -Headers @{ Origin = 'https://syn2sem.vercel.app' } -TimeoutSec 2
        return $health.ready -eq $true
    } catch {
        return $false
    }
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js is required for the Syn2Sem IDE connector. Install Node.js, then run this installer again.'
}

$installDirectory = Join-Path $env:LOCALAPPDATA 'Syn2Sem\IDE Helper'
$helperPath = Join-Path $installDirectory 'ide-companion.js'
$startupScript = Join-Path $installDirectory 'start-ide-helper.vbs'
$legacyStartupScript = Join-Path ([Environment]::GetFolderPath('Startup')) 'Syn2Sem IDE Helper.vbs'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'

New-Item -ItemType Directory -Path $installDirectory -Force | Out-Null
if ($LocalHelperPath) {
    if (-not (Test-Path -LiteralPath $LocalHelperPath -PathType Leaf)) {
        throw "The local IDE helper file was not found: $LocalHelperPath"
    }
    Copy-Item -LiteralPath $LocalHelperPath -Destination $helperPath -Force
} else {
    Invoke-WebRequest -Uri $HelperUri -OutFile $helperPath -UseBasicParsing
}

$escapedNode = $node.Source.Replace('"', '""')
$escapedHelper = $helperPath.Replace('"', '""')
$vbs = @"
Set shell = CreateObject("WScript.Shell")
shell.Run """" & "$escapedNode" & """ """ & "$escapedHelper" & """", 0, False
"@
Set-Content -LiteralPath $startupScript -Value $vbs -Encoding ASCII
Remove-Item -LiteralPath $legacyStartupScript -Force -ErrorAction SilentlyContinue
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
Set-ItemProperty -Path $runKey -Name 'Syn2SemIDEHelper' -Value "`"$wscript`" `"$startupScript`""

if (-not (Test-IdeHelperReady)) {
    Start-Process -FilePath $wscript -ArgumentList "`"$startupScript`""
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 500
        if (Test-IdeHelperReady) {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        Remove-ItemProperty -Path $runKey -Name 'Syn2SemIDEHelper' -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $startupScript -Force -ErrorAction SilentlyContinue
        throw 'The IDE connector did not start. Check that Node.js is installed and try again.'
    }
}

Write-Host 'Syn2Sem IDE connector is installed and ready.'
Write-Host 'It is registered to start automatically when you sign in to Windows.'
Write-Host 'You can now return to Syn2Sem and click your chosen IDE logo.'
