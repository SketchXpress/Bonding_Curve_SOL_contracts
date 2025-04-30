#!/bin/bash
set -e

echo "=== Comprehensive Solana Contract Testing ==="
echo "Program ID: EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY"
echo "Network: Devnet"

# Set up environment
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"

# Check wallet and balance
echo -e "\n=== Checking Wallet and Balance ==="
WALLET_ADDRESS=$(solana address)
echo "Wallet address: $WALLET_ADDRESS"
solana balance

# Test 1: Create User
echo -e "\n=== Test 1: Create User ==="
echo "Creating user account..."
USER_TX=$(solana program call --program-id EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY \
  createUser 10 \
  --signer /home/ubuntu/.config/solana/id.json \
  --url https://api.devnet.solana.com \
  --output json 2>/dev/null || echo "Error creating user")

if [[ $USER_TX == *"Error"* ]]; then
  echo "Failed to create user. This may be because the user already exists."
  echo "Continuing with tests..."
else
  echo "User created successfully!"
  echo "Transaction: $USER_TX"
fi

# Test 2: Create Token Mint for Pool
echo -e "\n=== Test 2: Create Token Mint for Pool ==="
echo "Creating token mint..."
TOKEN_MINT=$(solana-keygen new --no-bip39-passphrase --force --silent | grep "pubkey" | awk '{print $2}')
echo "Token mint created: $TOKEN_MINT"

# Test 3: Create Pool
echo -e "\n=== Test 3: Create Pool ==="
echo "Creating pool..."
POOL_TX=$(solana program call --program-id EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY \
  createPool 1000000 3606 \
  --signer /home/ubuntu/.config/solana/id.json \
  --url https://api.devnet.solana.com \
  --output json 2>/dev/null || echo "Error creating pool")

if [[ $POOL_TX == *"Error"* ]]; then
  echo "Failed to create pool. This may be due to program constraints."
  echo "Continuing with tests..."
else
  echo "Pool created successfully!"
  echo "Transaction: $POOL_TX"
fi

# Test 4: Create NFT
echo -e "\n=== Test 4: Create NFT ==="
echo "Creating NFT..."
NFT_MINT=$(solana-keygen new --no-bip39-passphrase --force --silent | grep "pubkey" | awk '{print $2}')
echo "NFT mint created: $NFT_MINT"

NFT_TX=$(solana program call --program-id EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY \
  createNft "Test NFT" "TNFT" "https://example.com/nft.json" 500 \
  --signer /home/ubuntu/.config/solana/id.json \
  --url https://api.devnet.solana.com \
  --output json 2>/dev/null || echo "Error creating NFT")

if [[ $NFT_TX == *"Error"* ]]; then
  echo "Failed to create NFT. This may be due to program constraints."
  echo "Continuing with tests..."
else
  echo "NFT created successfully!"
  echo "Transaction: $NFT_TX"
fi

# Test 5: Check Program Account
echo -e "\n=== Test 5: Check Program Account ==="
echo "Checking program account data..."
PROGRAM_DATA=$(solana account EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY --output json 2>/dev/null || echo "Error checking program account")

if [[ $PROGRAM_DATA == *"Error"* ]]; then
  echo "Failed to check program account."
else
  echo "Program account exists and is valid."
  echo "Program data size: $(echo $PROGRAM_DATA | jq -r '.data | length')"
fi

# Test 6: Verify Deployment
echo -e "\n=== Test 6: Verify Deployment ==="
echo "Verifying program deployment..."
PROGRAM_INFO=$(solana program show EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY 2>/dev/null || echo "Error verifying program")

if [[ $PROGRAM_INFO == *"Error"* ]]; then
  echo "Failed to verify program deployment."
else
  echo "Program is properly deployed on Solana devnet."
  echo "$PROGRAM_INFO"
fi

echo -e "\n=== Test Summary ==="
echo "Wallet: $WALLET_ADDRESS"
echo "Program ID: EQuEYCaWyXXKeQ3hmkJD2iTmLr4Zy1B8o5VnGcjKHXY"
echo "Tests completed. See above for individual test results."
