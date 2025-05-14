#!/bin/bash
# Remote server details
REMOTE_HOST="root@10.110.0.13"
REMOTE_DIR="/var/www/astro"

echo "Starting..."

# Create remote directory if it doesn't exist
echo "Ensuring remote directory exists..."
ssh $REMOTE_HOST "mkdir -p $REMOTE_DIR"

# Use rsync to mirror the local dist folder to the remote server
echo "Syncing local dist folder to remote server using rsync..."
rsync -avz --delete ./dist/ $REMOTE_HOST:$REMOTE_DIR/

echo "Busting caches"
curl -H "AccessKey:2c850977-17b0-436e-96fb-79cad7379c326fba050a-e10f-43ed-92f3-deb6f8d7d84e" --data "" https://bunnycdn.com/api/pullzone/2393713/purgeCache
curl https://metroretro.io?flush=1 -o /dev/null

echo "Process completed successfully."