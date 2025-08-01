# SketchXpress Bonding Curve System - API Documentation

## 🚀 Smart Contract API

### Program Information

- **Program ID**: `ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE`
- **Network**: Solana Devnet
- **Framework**: Anchor 0.29.0

### Core Instructions

#### `create_pool`

Creates a new bonding curve pool for an NFT collection.

**Parameters:**
```rust
pub struct CreatePoolArgs {
    pub name: String,              // Collection name (max 32 chars)
    pub symbol: String,            // Collection symbol (max 8 chars)
    pub base_price: u64,           // Starting price in lamports
    pub growth_factor: u16,        // Price growth rate (basis points)
    pub max_supply: u32,           // Maximum NFTs in collection
    pub migration_threshold: u64,  // Market cap for Tensor migration
}
```

**Accounts:**
- `pool` - Pool state account (PDA)
- `authority` - Pool creator and admin
- `collection_mint` - Collection mint account
- `collection_metadata` - Metaplex metadata account
- `system_program` - Solana system program

**Example Usage:**
```typescript
const createPoolTx = await program.methods
  .createPool({
    name: "My NFT Collection",
    symbol: "MNC",
    basePrice: new BN(10_000_000), // 0.01 SOL
    growthFactor: 1000,            // 10%
    maxSupply: 10000,
    migrationThreshold: new BN(690_000_000_000), // 690 SOL
  })
  .accounts({
    pool: poolPda,
    authority: wallet.publicKey,
    collectionMint: collectionMint,
    collectionMetadata: collectionMetadata,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### `mint_nft`

Mints a new NFT with dynamic pricing based on current supply.

**Parameters:**
```rust
pub struct MintNftArgs {
    pub name: String,           // NFT name
    pub symbol: String,         // NFT symbol  
    pub uri: String,            // Metadata URI
    pub collection_mint: Pubkey, // Collection mint address
}
```

**Accounts:**
- `pool` - Pool state account
- `nft_mint` - New NFT mint account
- `nft_metadata` - NFT metadata account
- `nft_master_edition` - Master edition account
- `collection_mint` - Collection mint
- `collection_metadata` - Collection metadata
- `minter` - NFT purchaser
- `escrow_account` - Token-owned escrow (PDA)

**Pricing Formula:**
```typescript
// Current price calculation
const currentPrice = basePrice * Math.pow(1 + growthFactor / 10000, currentSupply);
```

#### `buy_nft`

Purchases an NFT from the secondary market with escrow backing.

**Parameters:**
```rust
pub struct BuyNftArgs {
    pub max_price: u64,  // Maximum price willing to pay
}
```

**Accounts:**
- `nft_mint` - NFT mint account
- `seller` - Current NFT owner
- `buyer` - NFT purchaser
- `escrow_account` - Escrow account for this NFT
- `pool` - Associated pool account

#### `sell_nft`

Lists an NFT for sale on the secondary market.

**Parameters:**
```rust
pub struct SellNftArgs {
    pub min_price: u64,  // Minimum acceptable price
}
```

**Revenue Distribution:**
- **95%** → Original minter
- **4%** → Platform fee
- **1%** → Collection holders (proportional)

#### `place_bid`

Places a bid on an NFT that must exceed the bonding curve price plus premium.

**Parameters:**
```rust
pub struct PlaceBidArgs {
    pub bid_amount: u64,  // Bid amount in lamports
}
```

**Validation:**
```typescript
// Minimum bid calculation
const minimumBid = currentBondingCurvePrice + (currentBondingCurvePrice * 0.1); // 10% premium
```

#### `accept_bid`

Accepts the highest valid bid for an NFT.

**Accounts:**
- `nft_mint` - NFT being sold
- `seller` - NFT owner
- `bidder` - Winning bidder
- `bid_account` - Bid state account
- `escrow_account` - NFT escrow account

### State Accounts

#### `Pool`

```rust
pub struct Pool {
    pub authority: Pubkey,           // Pool admin
    pub collection_mint: Pubkey,     // Collection mint
    pub name: String,                // Collection name
    pub symbol: String,              // Collection symbol
    pub base_price: u64,             // Starting price
    pub growth_factor: u16,          // Growth rate (bps)
    pub max_supply: u32,             // Maximum supply
    pub current_supply: u32,         // Current minted count
    pub total_volume: u64,           // Total trading volume
    pub migration_threshold: u64,    // Migration trigger
    pub is_migrated: bool,           // Migration status
    pub created_at: i64,             // Creation timestamp
}
```

#### `EscrowAccount`

```rust
pub struct EscrowAccount {
    pub nft_mint: Pubkey,           // Associated NFT
    pub current_value: u64,         // SOL backing amount
    pub original_price: u64,        // Initial purchase price
    pub total_fees_collected: u64,  // Accumulated fees
    pub last_updated: i64,          // Last update timestamp
}
```

#### `BidAccount`

```rust
pub struct BidAccount {
    pub nft_mint: Pubkey,          // Target NFT
    pub bidder: Pubkey,            // Bidder's wallet
    pub bid_amount: u64,           // Bid amount
    pub expires_at: i64,           // Bid expiration
    pub is_active: bool,           // Bid status
}
```

### Error Codes

```rust
pub enum ErrorCode {
    #[msg("Insufficient funds for purchase")]
    InsufficientFunds = 6000,
    
    #[msg("Maximum supply reached")]
    MaxSupplyReached = 6001,
    
    #[msg("Bid amount too low")]
    BidTooLow = 6002,
    
    #[msg("Pool already migrated")]
    PoolMigrated = 6003,
    
    #[msg("Unauthorized access")]
    Unauthorized = 6004,
    
    #[msg("Invalid collection mint")]
    InvalidCollection = 6005,
    
    #[msg("Math overflow")]
    MathOverflow = 6006,
}
```

## 🌐 Frontend API

### Custom Hooks

#### `useCreatePool`

Creates a new bonding curve pool.

```typescript
const { createPool, loading, error } = useCreatePool();

await createPool({
  name: "Amazing Art Collection",
  symbol: "AAC",
  basePrice: 0.01,
  growthFactor: 10,
  maxSupply: 1000,
  migrationThreshold: 690,
});
```

#### `useMintNft`

Mints a new NFT in a collection.

```typescript
const { mintNft, loading, error, currentPrice } = useMintNft();

await mintNft({
  name: "Cool NFT #1",
  symbol: "CN1",
  uri: "https://metadata.example.com/1.json",
  collectionMint: collectionPublicKey,
});
```

#### `useBuyNft`

Purchases an NFT from secondary market.

```typescript
const { buyNft, loading, error } = useBuyNft();

await buyNft(nftMint, maxPrice);
```

#### `useSellNft`

Lists an NFT for sale.

```typescript
const { sellNft, loading, error } = useSellNft();

await sellNft(nftMint, minPrice);
```

#### `usePlaceBid`

Places a bid on an NFT.

```typescript
const { placeBid, loading, error, minimumBid } = usePlaceBid();

await placeBid(nftMint, bidAmount);
```

### Utility Functions

#### `calculateCurrentPrice`

Calculates the current minting price for a collection.

```typescript
export const calculateCurrentPrice = (
  basePrice: number,
  growthFactor: number,
  currentSupply: number
): number => {
  return basePrice * Math.pow(1 + growthFactor / 10000, currentSupply);
};
```

#### `formatPriceSOL`

Formats lamports to SOL with proper decimals.

```typescript
export const formatPriceSOL = (lamports: number): string => {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4) + " SOL";
};
```

#### `validateCollectionMint`

Validates a collection mint address.

```typescript
export const validateCollectionMint = async (
  connection: Connection,
  mint: PublicKey
): Promise<boolean> => {
  try {
    const mintInfo = await getMint(connection, mint);
    return mintInfo.supply === BigInt(0); // Must be collection mint
  } catch {
    return false;
  }
};
```

### Context Providers

#### `WalletContextProvider`

Manages wallet connections and state.

```typescript
const { 
  wallet, 
  connected, 
  connecting, 
  disconnect, 
  select 
} = useWallet();
```

#### `ProgramContextProvider`

Provides access to the Anchor program instance.

```typescript
const { program, connection } = useProgram();
```

## 📊 Analytics API

### Pool Statistics

```typescript
interface PoolStats {
  totalVolume: number;      // Total SOL traded
  marketCap: number;        // Current market capitalization
  holderCount: number;      // Unique NFT holders
  averagePrice: number;     // Average recent price
  priceChange24h: number;   // 24h price change %
  volumeChange24h: number;  // 24h volume change %
}

const getPoolStats = async (poolAddress: PublicKey): Promise<PoolStats>;
```

### Transaction History

```typescript
interface Transaction {
  signature: string;
  type: 'mint' | 'buy' | 'sell' | 'bid' | 'accept_bid';
  nftMint: PublicKey;
  price: number;
  timestamp: number;
  buyer?: PublicKey;
  seller?: PublicKey;
}

const getTransactionHistory = async (
  poolAddress: PublicKey,
  limit?: number
): Promise<Transaction[]>;
```

## 🔧 Configuration

### Environment Variables

```env
# Frontend Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com

# Optional: Custom RPC
NEXT_PUBLIC_CUSTOM_RPC=https://your-rpc-endpoint.com

# Analytics (Optional)
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Program Configuration

```toml
# Anchor.toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
bonding_curve_system = "ADpHtc58rmFaXYzMNeXKHCbornttL7Be2fUmgGQC3dpE"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## 🚨 Rate Limits & Best Practices

### RPC Rate Limits

- **Free tier**: 100 requests/minute
- **Paid tier**: 1000+ requests/minute
- **Implement caching** for frequently accessed data
- **Use WebSocket connections** for real-time updates

### Transaction Best Practices

- **Set appropriate timeouts** (30-60 seconds)
- **Implement retry logic** for failed transactions
- **Use priority fees** during network congestion
- **Batch operations** when possible

### Error Handling

```typescript
try {
  const signature = await mintNft(...args);
  await confirmTransaction(signature);
} catch (error) {
  if (error.code === 6001) {
    // Handle specific error (Max supply reached)
    showError("Collection is sold out!");
  } else {
    // Handle generic error
    showError("Transaction failed. Please try again.");
  }
}
```

---

For more detailed examples and integration guides, see our [GitHub repository](https://github.com/SketchXpress/Bonding_Curve_SOL_contracts) and [documentation](./docs/).
