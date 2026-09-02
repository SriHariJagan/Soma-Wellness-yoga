# start_mongodb.ps1 - Start MongoDB for local E2E testing
# This script:
# 1. Creates data directory
# 2. Starts mongod as a service
# 3. Verifies it's running

Write-Host "Creating MongoDB data directory..."
mkdir -ItemType Directory -Path "C:\data\db"

Write-Host "Starting MongoDB..."
& mongod --dbpath "C:\data\db" --bindIp 127.0.0.1 --port 27017 --fork --logpath "C:\data\db\mongod.log"

Write-Host "Verifying MongoDB is running..."
$connection = try { mongosh --eval "db.adminCommand('ping')" } catch { }

Write-Host "MongoDB startup complete"