#!/bin/bash
set -e

echo "=== Anchor CLI Interaction Demo for Bonding Curve System ==="
echo "Program ID: CTvGUgoe7mPHiZw8tMidyq84YToLAVGpETA56M33ATv6"
echo "Network: Devnet"

# Set up environment
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"

# Check wallet and balance
echo -e "\n=== Checking Wallet and Balance ==="
WALLET_ADDRESS=$(solana address)
echo "Wallet address: $WALLET_ADDRESS"
solana balance

# Set Solana config to devnet
echo -e "\n=== Setting Solana Config to Devnet ==="
solana config set --url https://api.devnet.solana.com
echo "Solana config set to devnet"

# Verify IDL file exists
echo -e "\n=== Verifying IDL File ==="
IDL_PATH="./target/idl/bonding_curve_system.json"
if [ ! -f "$IDL_PATH" ]; then
  echo "ERROR: IDL file not found at $IDL_PATH"
  exit 1
fi
echo "IDL file found at $IDL_PATH"

# Create a directory for Anchor CLI configuration
echo -e "\n=== Setting Up Anchor CLI Configuration ==="
mkdir -p ~/.config/anchor
echo "Created Anchor config directory"

# Create Anchor config file
cat > ~/.config/anchor/config.toml << EOF
[provider]
cluster = "devnet"
wallet = "/home/ubuntu/.config/solana/id.json"

[programs.devnet]
bonding_curve_system = "CTvGUgoe7mPHiZw8tMidyq84YToLAVGpETA56M33ATv6"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
EOF
echo "Created Anchor config file"

# Function to display Anchor CLI command for an instruction
function display_anchor_command() {
  INSTRUCTION=$1
  ARGS=$2
  ACCOUNTS=$3
  
  echo -e "\n=== Anchor CLI Command for $INSTRUCTION ==="
  echo "anchor call $INSTRUCTION $ARGS \\"
  echo "  --program-id CTvGUgoe7mPHiZw8tMidyq84YToLAVGpETA56M33ATv6 \\"
  echo "  --provider.cluster devnet \\"
  echo "  --provider.wallet /home/ubuntu/.config/solana/id.json \\"
  if [ ! -z "$ACCOUNTS" ]; then
    echo "  --accounts $ACCOUNTS \\"
  fi
  echo "  --idl $IDL_PATH"
}

# Display commands for each instruction

# 1. Create User
echo -e "\n=== Instruction: createUser ==="
echo "Description: Creates a new user account to track NFT ownership and token balances"
echo "Arguments:"
echo "  - maxNfts: Maximum number of NFTs the user can own (u8)"
display_anchor_command "createUser" "10" ""

# 2. Create Pool
echo -e "\n=== Instruction: createPool ==="
echo "Description: Initializes a new bonding curve pool with specified parameters"
echo "Arguments:"
echo "  - basePrice: Base price for the bonding curve (u64)"
echo "  - growthFactor: Growth factor for the bonding curve (u64)"
display_anchor_command "createPool" "1000000 3606" ""

# 3. Buy Token
echo -e "\n=== Instruction: buyToken ==="
echo "Description: Allows users to purchase synthetic tokens using the bonding curve"
echo "Arguments:"
echo "  - amount: Amount of tokens to buy (u64)"
display_anchor_command "buyToken" "10000000" ""

# 4. Sell Token
echo -e "\n=== Instruction: sellToken ==="
echo "Description: Allows users to sell synthetic tokens back to the pool"
echo "Arguments:"
echo "  - amount: Amount of tokens to sell (u64)"
display_anchor_command "sellToken" "5000000" ""

# 5. Create NFT
echo -e "\n=== Instruction: createNft ==="
echo "Description: Creates a new NFT with metadata"
echo "Arguments:"
echo "  - name: Name of the NFT (string)"
echo "  - symbol: Symbol of the NFT (string)"
echo "  - uri: URI for the NFT metadata (string)"
echo "  - sellerFeeBasisPoints: Seller fee in basis points (u16)"
display_anchor_command "createNft" '"My NFT" "MNFT" "https://example.com/nft.json" 500' ""

# 6. Buy NFT
echo -e "\n=== Instruction: buyNft ==="
echo "Description: Facilitates the purchase of an NFT between users"
echo "Arguments: None (NFT mint address is specified in accounts)"
display_anchor_command "buyNft" "" ""

echo -e "\n=== Important Notes ==="
echo "1. The above commands are templates. You need to provide the correct account addresses for each instruction."
echo "2. For account addresses, you need to derive PDAs (Program Derived Addresses) based on the contract's seeds."
echo "3. Some instructions require token accounts to be created beforehand."
echo "4. Always check the IDL for the exact account requirements for each instruction."

echo -e "\n=== Example: Creating a User Account ==="
echo "To create a user account, you would run:"
echo "anchor call createUser 10 \\"
echo "  --program-id CTvGUgoe7mPHiZw8tMidyq84YToLAVGpETA56M33ATv6 \\"
echo "  --provider.cluster devnet \\"
echo "  --provider.wallet /home/ubuntu/.config/solana/id.json \\"
echo "  --idl $IDL_PATH"

echo -e "\n=== Anchor CLI Setup Complete ==="
echo "You can now use the Anchor CLI to interact with the Bonding Curve System contract."
