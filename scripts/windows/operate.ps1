$ProjectDir = "C:\Users\cocac\Lottery Resale Tracker"
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "operate.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-RunLog {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  $line | Tee-Object -FilePath $LogFile -Append
}

Write-RunLog "operate start"

try {
  Push-Location $ProjectDir
  & npm.cmd run operate 2>&1 | Tee-Object -FilePath $LogFile -Append
  $ExitCode = $LASTEXITCODE
} catch {
  $ExitCode = 1
  Write-RunLog ("operate exception: {0}" -f $_.Exception.Message)
} finally {
  Pop-Location
}

if ($ExitCode -eq 0) {
  Write-RunLog "operate success exitCode=0"
} else {
  Write-RunLog ("operate failed exitCode={0}" -f $ExitCode)
}

Write-RunLog "operate end"
exit $ExitCode
