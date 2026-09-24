param(
    [switch]$Detached
)

# Windows-safe launcher for the Ogeemo dev server.
#
# The npm "dev" script uses bash-style env syntax ("NEXT_DIST_DIR=.next-dev next dev")
# which cmd.exe cannot execute ("'NEXT_DIST_DIR' is not recognized..."). This script
# sets the variable the PowerShell way and runs Next directly.
#
# The Next cache is repaired and pinned before start-up (see below): OneDrive
# "Files On-Demand" can dehydrate generated files into cloud placeholders,
# which makes Next fail with "EINVAL: invalid argument, readlink".
#
# Foreground (visible console):  npm run dev:win
# Detached (background, logs to dev-server.log):
#   Start-Process pwsh -ArgumentList '-NoProfile','-File',(Join-Path (Get-Location) 'scripts\start-dev.ps1'),'-Detached' -WindowStyle Hidden

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# The cache has to stay at .next-dev: Next writes that path into the
# tsconfig.json type includes, so relocating it dirties a tracked file on
# every run. Clearing a dehydrated cache and pinning the folder keeps
# OneDrive from breaking the next start-up instead.
& (Join-Path $PSScriptRoot 'prepare-next-cache.ps1') -Paths '.next-dev'

$env:NEXT_DIST_DIR = '.next-dev'

if ($Detached) {
    npx next dev -p 9002 *> "$projectRoot\dev-server.log"
} else {
    npx next dev -p 9002
}