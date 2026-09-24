param(
    [switch]$Clean
)

# Windows-safe production build for Ogeemo.
#
# The build cache stays in the project as .next: Next records that folder in
# tsconfig.json's type includes, so relocating it (or naming it .next-build)
# makes Next rewrite tsconfig.json on every run with a machine-specific path.
# Instead we repair and pin the cache, because OneDrive "Files On-Demand" can
# dehydrate generated files into cloud placeholders, and Next then fails with:
#   EINVAL: invalid argument, readlink '...\.next\diagnostics\framework.json'
#
# Usage:  npm run build:win        (or: pwsh -NoProfile -File scripts\build.ps1)
#         pwsh -NoProfile -File scripts\build.ps1 -Clean

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if ($Clean) {
    Remove-Item -Recurse -Force (Join-Path $projectRoot '.next') -ErrorAction SilentlyContinue
}

& (Join-Path $PSScriptRoot 'prepare-next-cache.ps1') -Paths '.next'

npx next build
exit $LASTEXITCODE
