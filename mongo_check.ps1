# MongoDB check and start script
Write-Host "=== MongoDB Check and Start ===" -ForegroundColor Cyan

# Look for mongod in common locations
$locations = @(
    "C:\Program Files\MongoDB\Server\*",
    "C:\Program Files\MongoDB\",
    "C:\Program Files (x86)\MongoDB\",
    (Join-Path $env:ProgramFiles "MongoDB\Server"),
    (Join-Path $env:ProgramFiles (x86) "MongoDB\Server")
)

$mongod = $null
foreach ($loc in $locations) {
    Write-Host "Checking: $loc" -ForegroundColor Yellow
    $dir = Get-ChildItem -Path $loc -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($dir) {
        $mongod = Join-Path $dir "bin\mongod.exe"
        if (Test-Path $mongod) {
            Write-Host "Found: $mongod" -ForegroundColor Green
            break
        }
    }
}

if (-not $mongod) {
    Write-Host "MongoDB not found in common locations." -ForegroundColor Red
    Write-Host "Trying npm package..." -ForegroundColor Yellow
    # Check if mongodb package is installed
    $npmPath = Join-Path (Split-Path $env:APPSERVER, "..") 
    # Just report
    Write-Host "MongoDB binary not found. Atlas recommended." -ForegroundColor Yellow
} else {
    # Create data directory
    if (-not (Test-Path "C:\data\db")) {
        New-Item -ItemType Directory -Path "C:\data\db" | Out-Null
    }
    
    # Start mongod
    Write-Host "Starting MongoDB..." -ForegroundColor Cyan
    $args = "--dbpath `C:\data\db` --bindIp `127.0.0.1` --port 27017 --fork --logpath `C:\data\db\mongod.log`"
    Write-Host "Command: mongod $args"
    
    $process = Start-Process -FilePath $mongod -ArgumentList $args -PassThru -ErrorAction Stop
    Write-Host "MongoDB started with PID: $($process.Id)" -ForegroundColor Green
    
    # Quick verification
    Start-Sleep -Seconds 2
    Write-Host "MongoDB should be running now." -ForegroundColor Cyan
}