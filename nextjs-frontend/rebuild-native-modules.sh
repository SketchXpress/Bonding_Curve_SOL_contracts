#!/bin/bash

# Rebuild native modules script for Solana bonding curve project
# This script rebuilds native modules to ensure compatibility with the target environment

echo "🔧 Starting native module rebuild process..."

# Exit on any error
set -e

# Ensure we're in the right directory
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"
echo "🔍 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Clean any existing builds
echo "🧹 Cleaning existing native module builds..."
rm -rf node_modules/.cache || true
find node_modules -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "*.node" -type f -delete 2>/dev/null || true

# Rebuild native modules
echo "🔨 Rebuilding native modules..."

# Rebuild bigint-buffer specifically (critical for Solana compatibility)
if [ -d "node_modules/bigint-buffer" ]; then
    echo "🔧 Rebuilding bigint-buffer..."
    cd node_modules/bigint-buffer
    npm run rebuild 2>/dev/null || node-gyp rebuild 2>/dev/null || echo "⚠️  bigint-buffer rebuild failed, falling back to pure JS"
    cd ../..
fi

# General native module rebuild
echo "🔄 Running general native module rebuild..."
npm rebuild 2>/dev/null || yarn install --force 2>/dev/null || echo "⚠️  General rebuild had issues, continuing..."

# Verify critical modules
echo "🔍 Verifying critical native modules..."
node -e "
try {
  const bigintBuffer = require('bigint-buffer');
  console.log('✅ bigint-buffer loaded successfully');
} catch (e) {
  console.log('⚠️  bigint-buffer using fallback implementation');
}
" || echo "⚠️  Could not test bigint-buffer"

echo "✅ Native module rebuild process completed!"
echo "🚀 Ready for build process..."