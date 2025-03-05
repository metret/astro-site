#!/bin/bash
# Remote server details
REMOTE_HOST="root@10.110.0.13"
REMOTE_DIR="/var/www/astro"
TARBALL_NAME="astro.tar.gz"
BACKUP_NAME="astro-$(date +%Y%m%d_%H%M%S).tar.gz"

echo "Starting..."

# Create backup of remote directory
echo "Creating backup of remote directory..."
ssh $REMOTE_HOST "if [ -d $REMOTE_DIR ]; then tar -czf /tmp/$BACKUP_NAME -C $REMOTE_DIR . && mv /tmp/$BACKUP_NAME $REMOTE_DIR/../$BACKUP_NAME; fi"

# Create tarball of local dist folder
echo "Creating tarball of local dist folder..."
tar -czf $TARBALL_NAME -C ./dist .

# Upload tarball to remote server
echo "Uploading tarball to remote server..."
scp $TARBALL_NAME $REMOTE_HOST:/tmp/$TARBALL_NAME

# Remove remote folder and replace with contents of tarball
echo "Removing remote $REMOTE_DIR folder and replacing with tarball contents..."
ssh $REMOTE_HOST "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR && tar -xzf /tmp/$TARBALL_NAME -C $REMOTE_DIR"

# Remove tarball from remote server
echo "Removing tarball from remote server..."
ssh $REMOTE_HOST "rm /tmp/$TARBALL_NAME"

# Remove local tarball
echo "Removing local tarball..."
rm $TARBALL_NAME

echo "Process completed successfully."
echo "Backup created at: $REMOTE_DIR/../$BACKUP_NAME"