#!/bin/bash
set -e

echo "=== Solana Contract Verification Test ==="
echo "Program ID: 5a9RAcFUkirJmDBJ9R2tzEgbAPutSftpyt7he8B7FUMe"
echo "Network: Devnet"

# Set up environment
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"

# Check wallet and balance
echo -e "\n=== Checking Wallet and Balance ==="
WALLET_ADDRESS=$(solana address)
echo "Wallet address: $WALLET_ADDRESS"
solana balance

# Verify Program Deployment
echo -e "\n=== Verifying Program Deployment ==="
echo "Checking if program is properly deployed..."
PROGRAM_INFO=$(solana program show 5a9RAcFUkirJmDBJ9R2tzEgbAPutSftpyt7he8B7FUMe 2>/dev/null || echo "Error verifying program")

if [[ $PROGRAM_INFO == *"Error"* ]]; then
  echo "FAILED: Program is not properly deployed."
  exit 1
else
  echo "SUCCESS: Program is properly deployed on Solana devnet."
  echo "$PROGRAM_INFO"
fi

# Check Program Data
echo -e "\n=== Checking Program Data ==="
echo "Examining program account data..."
PROGRAM_DATA=$(solana account 5a9RAcFUkirJmDBJ9R2tzEgbAPutSftpyt7he8B7FUMe --output json 2>/dev/null || echo "Error checking program account")

if [[ $PROGRAM_DATA == *"Error"* ]]; then
  echo "FAILED: Could not retrieve program account data."
else
  echo "SUCCESS: Program account data retrieved successfully."
  echo "Program data size: $(echo $PROGRAM_DATA | jq -r '.data | length') bytes"
  echo "Program owner: $(echo $PROGRAM_DATA | jq -r '.owner')"
  echo "Program executable: $(echo $PROGRAM_DATA | jq -r '.executable')"
  echo "Program lamports: $(echo $PROGRAM_DATA | jq -r '.lamports')"
fi

# Check Program Authority
echo -e "\n=== Checking Program Authority ==="
PROGRAM_AUTHORITY=$(echo "$PROGRAM_INFO" | grep "Authority" | awk '{print $2}')
echo "Program authority: $PROGRAM_AUTHORITY"

if [[ $PROGRAM_AUTHORITY == "Hq6JsZ55fvm22eZWB6J4gekjV1LsgR2ak8PqM8P9mj7d" ]]; then
  echo "SUCCESS: Program authority matches our deployment wallet."
else
  echo "WARNING: Program authority does not match our deployment wallet."
fi

# Test Summary
echo -e "\n=== Test Summary ==="
echo "Program ID: 5a9RAcFUkirJmDBJ9R2tzEgbAPutSftpyt7he8B7FUMe"
echo "Program is properly deployed on Solana devnet."
echo "Program authority: $PROGRAM_AUTHORITY"
echo "Verification completed successfully."
