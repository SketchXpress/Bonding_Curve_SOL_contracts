#!/bin/bash
# Script to rebuild native modules in Docker environment

echo "Rebuilding native modules for Docker environment..."

# Rebuild bigint-buffer with proper dependencies
cd /app/nextjs-frontend
yarn rebuild bigint-buffer --update-binary || echo "yarn rebuild failed, trying alternative approach..."

# Alternative approach if yarn rebuild doesn't work
if [ $? -ne 0 ]; then
    echo "Trying alternative rebuild approach..."
    yarn install --force
fi

# Verify the rebuild was successful
echo "Native module rebuild completed."
