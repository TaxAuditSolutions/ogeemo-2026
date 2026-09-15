param(
    [switch]$Detached
)

# Windows-safe launcher for the Ogeemo dev server.
#
# The npm "dev" script uses bash-style env syntax ("NEXT_DIST_DIR=.next-dev next dev")
# which cmd.exe cannot execute ("'NEXT_DIST_DIR' is not recognized..."). This script
# sets the variable the PowerShell way and runs Next directly.
#
# Foreground (visible console):  npm run dev:win
# Detached (background, logs to dev-server.log):
#   Start-Process pwsh -ArgumentList '-NoProfile','-File',(Join-Path (Get-Location) 'scripts\start-dev.ps1'),'-Detached' -WindowStyle Hidden

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:NEXT_DIST_DIR = '.next-dev'

if ($Detached) {
    npx next dev -p 9002 *> "$projectRoot\dev-server.log"
} else {
    npx next dev -p 9002
}