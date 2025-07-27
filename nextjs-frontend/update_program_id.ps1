# PowerShell script to update Program ID across all frontend files
$oldProgramId = "5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf"
$newProgramId = "2aaD5Ga4GPFTATJKNyGrpdMLyBrv9ZSee5Wb3nEPGGmN"

# Define file patterns to update
$filePatterns = @(
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.js",
    "src/**/*.jsx"
)

# Function to update files
function Update-ProgramId {
    param (
        [string]$filePath
    )
    
    $content = Get-Content $filePath -Raw
    if ($content -match $oldProgramId) {
        Write-Host "Updating: $filePath"
        $updatedContent = $content -replace $oldProgramId, $newProgramId
        Set-Content $filePath -Value $updatedContent -NoNewline
    }
}

# Get all TypeScript and JavaScript files in src directory
$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx"

Write-Host "Found $($files.Count) files to check..."

foreach ($file in $files) {
    Update-ProgramId -filePath $file.FullName
}

Write-Host "Program ID update complete!"
Write-Host "Old ID: $oldProgramId"
Write-Host "New ID: $newProgramId"
