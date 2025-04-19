#!/bin/bash
# Script to rebuild native modules in Docker environment

echo "Rebuilding native modules for Docker environment..."

# Rebuild bigint-buffer with proper dependencies
cd /app/nextjs-frontend
npm rebuild bigint-buffer --update-binary

# Verify the rebuild was successful
echo "Native module rebuild completed."
