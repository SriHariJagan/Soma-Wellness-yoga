/root/.ssh/pragya_yoga_ed25519



cd /var/www/project/pragya-yoga

echo "Pulling latest code..."
git pull origin main
asks for password: ---------------------

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Building Docker image..."
docker compose build --no-cache

echo "Starting/recreating application..."
docker compose up -d

echo "Checking container..."
docker compose ps

echo "Testing Nginx..."
nginx -t

echo "Reloading Nginx..."
systemctl reload nginx

echo "Deployment completed!"

docker compose logs --tail=30


