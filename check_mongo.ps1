# check_mongo.ps1 - Check and start MongoDB
Write-Host "Checking for MongoDB..."

# Check if mongod.exe exists
$mongodPath = "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
if (-not (Test-Path $mongodPath)) {
    $mongodPath = "C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
}
if (-not (Test-Path $mongodPath)) {
    $mongodPath = "C:\Program Files\MongoDB\Server\4.4\bin\mongod.exe"
}

Write-Host "Looking for mongod at: $mongodPath"
if (Test-Path $mongodPath) {
    Write-Host "Found mongod!"
    
    # Create data directory
    if (-not (Test-Path "C:\data\db")) {
        New-Item -ItemType Directory -Path "C:\data\db"
    }
    
    # Start mongod
    Write-Host "Starting MongoDB..."
    $process = Start-Process -FilePath $mongodPath -ArgumentList "--dbpath `C:\data\db` --bindIp `127.0.0.1` --port 27017 --fork --logpath `C:\data\db\mongod.log`" -PassThru
    Write-Host "MongoDB started with PID: $($process.Id)"
} else {
    Write-Host "MongoDB not installed at common paths."
    Write-Host "Looking in PATH..."
    $pathDirs = $env:PATH -split ";"
    foreach ($dir in $pathDirs) {
        $potential = Join-Path $dir "mongod.exe"
        if (Test-Path $potential) {
            Write-Host "Found at: $potential"
            break
        }
    }
}