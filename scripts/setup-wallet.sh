#!/bin/bash

# Setup script to ensure wallet is properly configured

# Get current user home directory
USER_HOME=$(eval echo ~$USER)
SOLANA_CONFIG_DIR="$USER_HOME/.config/solana"

echo "Setting up Solana wallet for user: $USER"
echo "Home directory: $USER_HOME"
echo "Solana config directory: $SOLANA_CONFIG_DIR"

# Create config directory if it doesn't exist
mkdir -p "$SOLANA_CONFIG_DIR"

# Check if wallet exists
if [ ! -f "$SOLANA_CONFIG_DIR/id.json" ]; then
    echo "Creating new wallet at $SOLANA_CONFIG_DIR/id.json"
    solana-keygen new --no-bip39-passphrase -o "$SOLANA_CONFIG_DIR/id.json" --force
else
    echo "Wallet already exists at $SOLANA_CONFIG_DIR/id.json"
fi

# Set Solana config
echo "Setting Solana config to use devnet"
solana config set --url devnet
solana config set --keypair "$SOLANA_CONFIG_DIR/id.json"

# Export ANCHOR_WALLET environment variable
export ANCHOR_WALLET="$SOLANA_CONFIG_DIR/id.json"
echo "export ANCHOR_WALLET=\"$SOLANA_CONFIG_DIR/id.json\"" >> "$USER_HOME/.bashrc"

# Display wallet address
echo "Wallet address: $(solana address)"
echo "Wallet balance: $(solana balance)"

echo "Wallet setup complete!"
echo "You can now run 'anchor build' and 'anchor deploy'"
