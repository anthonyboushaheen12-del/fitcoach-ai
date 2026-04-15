# Stage all changes, commit with message, push. Run from repo root or any path (script cds to fitcoach-ai).
# .\scripts\commit-and-push.ps1 "Your commit message"

param(
    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Test-Path ".git")) {
    Write-Error ".git not found at $repoRoot"
    exit 1
}

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nothing to commit; pushing anyway."
    git push
    exit 0
}

git add -A
git commit -m $Message
git push
