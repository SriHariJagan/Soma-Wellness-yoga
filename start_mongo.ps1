# Start MongoDB
mkdir -p C:\data\db
mongod --dbpath C:\data\db --bind_ip 127.0.0.1 --port 27017 --fork --logpath C:\data\db\mongod.log
Write-Host "MongoDB started"