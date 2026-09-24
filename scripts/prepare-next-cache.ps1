param(
    [string[]]$Paths = @('.next', '.next-dev')
)

# OneDrive "Files On-Demand" can dehydrate Next.js cache files into cloud
# placeholders (a file whose Attributes show ReparsePoint but no LinkType). Next
# then fails with:
#   EINVAL: invalid argument, readlink '...\.next\diagnostics\framework.json'
# This helper detects that state before a dev run or build, clears the poisoned
# cache, and marks the cache folders as "always keep on this device" so OneDrive
# stops dehydrating them.

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Test-Dehydrated {
    param([string]$Path)

    $items = Get-ChildItem -Path $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
        Where-Object { ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -and -not $_.LinkType }
    return @($items).Count -gt 0
}

foreach ($relative in $Paths) {
    $target = Join-Path $projectRoot $relative

    if ((Test-Path $target) -and (Test-Dehydrated -Path $target)) {
        Write-Output "Clearing dehydrated Next cache: $relative"
        Remove-Item -Recurse -Force $target -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path $target)) {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
    }
}

# Pin (and stop dehydrating) the cache folders. 'attrib +P -U' is the CLI
# equivalent of "Always keep on this device" / "Free up space" toggle.
foreach ($relative in $Paths) {
    $target = Join-Path $projectRoot $relative
    if (Test-Path $target) {
        & attrib +P -U /s /d $target | Out-Null
    }
}

Write-Output "Next cache folders checked and pinned: $($Paths -join ', ')"
