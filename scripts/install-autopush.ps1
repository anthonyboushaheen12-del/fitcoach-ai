# Install post-commit hook for automatic git push
# Run: powershell -ExecutionPolicy Bypass -File scripts/install-autopush.ps1

$hookDir = Join-Path (Get-Location) ".git\hooks"
$hookFile = Join-Path $hookDir "post-commit"
$sourceFile = Join-Path (Get-Location) "scripts\post-commit.hook"

if (-not (Test-Path ".git\hooks")) {
    Write-Host "Error: .git/hooks not found. Run this from the project root."
    exit 1
}

Copy-Item -Path $sourceFile -Destination $hookFile -Force
Write-Host "Installed post-commit hook. Commits will now auto-push to remote."
