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

echo "Process completed successfully."