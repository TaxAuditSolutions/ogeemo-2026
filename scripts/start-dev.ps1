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
#   $script = Join-Path (Get-Location) 'scripts\start-dev.ps1'
#   Start-Process powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',('"' + $script + '"'),'-Detached' -WindowStyle Hidden
# Two gotchas baked into that line:
#   1. The -File path MUST be wrapped in embedded quotes - the project lives
#      under "Project Ogeemo Dev", and Start-Process -ArgumentList joins array
#      elements without quoting, so pwsh gets a truncated path and exits
#      silently (hidden window, zero output).
#   2. Use powershell.exe, NOT pwsh. This machine's pwsh is the Store-packaged
#      build, and Start-Process on a packaged exe hands the child a PATH of
#      only the pwsh package directory - no System32, no nodejs - so `attrib`
#      and `npx` are "not recognized" and the server never starts. (The PATH
#      self-heal below covers this, but powershell.exe avoids it entirely.)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Self-heal PATH: if a launcher handed us a stripped PATH (see note 2 above),
# rebuild it from the registry so attrib (System32) and npx (nodejs) resolve.
if (-not (Get-Command attrib -ErrorAction SilentlyContinue) -or
    -not (Get-Command npx -ErrorAction SilentlyContinue)) {
    $env:PATH = @(
        [Environment]::GetEnvironmentVariable('PATH', 'Machine')
        [Environment]::GetEnvironmentVariable('PATH', 'User')
    ) -join ';'
}

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