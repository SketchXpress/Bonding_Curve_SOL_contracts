#!/bin/bash

# NFT Minting Rebuild Script
# This script automates the process of rebuilding and redeploying the Solana program
# and updating the frontend with the fixed NFT minting implementation.

set -e # Exit on error

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
  local level=$1
  local message=$2
  local color=$BLUE
  
  case $level in
    "INFO") color=$BLUE ;;
    "SUCCESS") color=$GREEN ;;
    "WARN") color=$YELLOW ;;
    "ERROR") color=$RED ;;
  esac
  
  echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [$level]${NC} $message"
}

# Check if we're in the project root or nextjs-frontend directory
if [ -d "nextjs-frontend" ]; then
  PROJECT_ROOT=$(pwd)
  FRONTEND_DIR="$PROJECT_ROOT/nextjs-frontend"
elif [ -f "package.json" ] && grep -q "next" "package.json"; then
  FRONTEND_DIR=$(pwd)
  PROJECT_ROOT=$(dirname "$FRONTEND_DIR")
else
  log "ERROR" "Please run this script from either the project root or nextjs-frontend directory"
  exit 1
fi

log "INFO" "Project root: $PROJECT_ROOT"
log "INFO" "Frontend directory: $FRONTEND_DIR"

# Step 1: Clean all build artifacts
log "INFO" "Step 1: Cleaning all build artifacts..."

cd "$PROJECT_ROOT"
log "INFO" "Running cargo clean..."
cargo clean

log "INFO" "Running anchor clean..."
anchor clean

log "INFO" "Removing target directory..."
rm -rf target/

log "INFO" "Removing node_modules cache..."
rm -rf node_modules/.cache

log "SUCCESS" "All build artifacts cleaned successfully"

# Step 2: Rebuild the Solana program
log "INFO" "Step 2: Rebuilding the Solana program..."

cd "$PROJECT_ROOT"
log "INFO" "Running anchor build with force flag..."
anchor build --force

log "SUCCESS" "Solana program rebuilt successfully"

# Step 3: Deploy the Solana program
log "INFO" "Step 3: Deploying the Solana program..."

cd "$PROJECT_ROOT"
log "INFO" "Running anchor deploy with force flag..."
anchor deploy --force

log "SUCCESS" "Solana program deployed successfully"

# Step 4: Update the frontend with the fixed implementation
log "INFO" "Step 4: Updating the frontend with the fixed NFT minting implementation..."

cd "$FRONTEND_DIR"

# Check if the hooks directory exists
if [ ! -d "src/hooks" ]; then
  log "INFO" "Creating hooks directory..."
  mkdir -p src/hooks
fi

# Copy the fixed implementation
log "INFO" "Copying fixed NFT minting implementation..."
cp "$PROJECT_ROOT/fixed_account_keys_useNftTransactions.ts" "$FRONTEND_DIR/src/hooks/useNftTransactions.ts"

log "SUCCESS" "Frontend updated with fixed NFT minting implementation"

# Step 5: Restart the frontend development server
log "INFO" "Step 5: Restarting the frontend development server..."

cd "$FRONTEND_DIR"

# Check if the frontend server is running
if pgrep -f "next dev" > /dev/null; then
  log "INFO" "Stopping existing frontend server..."
  pkill -f "next dev"
  sleep 2
fi

log "INFO" "Starting frontend server in the background..."
npm run dev > frontend.log 2>&1 &

log "SUCCESS" "Frontend server started in the background"

# Final summary
log "SUCCESS" "NFT Minting Rebuild Complete!"
log "INFO" "The Solana program has been rebuilt and redeployed with all necessary changes."
log "INFO" "The frontend has been updated with the fixed NFT minting implementation."
log "INFO" "You can now test the NFT minting functionality in your browser."
log "INFO" "Frontend logs are available in $FRONTEND_DIR/frontend.log"

# Instructions for testing
cat << EOF

${GREEN}=== Testing Instructions ===${NC}

1. Open your browser and navigate to http://localhost:3000
2. Connect your wallet
3. Fill in the NFT details (name, symbol, URI, seller fee basis points)
4. Click the "Create NFT" button
5. Approve the three transactions in sequence
6. Verify that the NFT was created successfully

${YELLOW}If you encounter any issues:${NC}
- Check the frontend logs: $FRONTEND_DIR/frontend.log
- Check the Solana program logs: solana logs -u localhost
- Run the script again with additional debugging enabled

EOF

log "INFO" "Script completed successfully"
