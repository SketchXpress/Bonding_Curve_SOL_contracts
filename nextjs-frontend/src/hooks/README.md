# Bonding Curve System Frontend Hooks

This directory contains React hooks for interacting with the Bonding Curve System smart contract on Solana. These hooks provide a complete interface for all contract functionality.

## Core Contract Hooks

### Pool Management

#### `useCreatePool`
Creates a new bonding curve pool for a collection.

```typescript
import { useCreatePool } from '@/hooks';

const { createPool, getPoolPda, getPoolData, isLoading, error } = useCreatePool();

// Create a new pool
const poolAddress = await createPool({
  collectionMint: new PublicKey('...'),
  basePrice: 0.1, // Starting price in SOL
  growthFactor: 3606, // Optional growth factor
});
```

#### `usePoolInfo`
Retrieves detailed information about bonding curve pools.

```typescript
import { usePoolInfo } from '@/hooks';

const { getPoolInfo, getAllPools, getPoolStats, calculateCurrentPrice } = usePoolInfo();

// Get specific pool info
const poolInfo = await getPoolInfo(collectionMint);

// Get all pools
const allPools = await getAllPools();

// Calculate current price
const price = calculateCurrentPrice(basePrice, growthFactor, currentSupply);
```

### NFT Operations

#### `useCreateCollectionNft`
Creates a collection NFT that serves as the master for a collection.

```typescript
import { useCreateCollectionNft } from '@/hooks';

const { createCollectionNft, getCollectionMetadata, isLoading, error } = useCreateCollectionNft();

const collectionMint = await createCollectionNft({
  name: "My Collection",
  symbol: "MC",
  uri: "https://metadata.uri",
});
```

#### `useMintNft`
Mints new NFTs within a collection using the bonding curve pricing.

```typescript
import { useMintNft } from '@/hooks';

const { mintNft, getNftEscrowData, getMinterTracker, isLoading, error } = useMintNft();

const nftMint = await mintNft({
  collectionMint: new PublicKey('...'),
  name: "NFT Name",
  symbol: "NFT",
  uri: "https://nft.metadata.uri",
});
```

#### `useBuyNft`
Purchases NFTs from other users at current bonding curve prices.

```typescript
import { useBuyNft } from '@/hooks';

const { buyNft, getCurrentPrice, getNftOwner, isLoading, error } = useBuyNft();

const signature = await buyNft({
  nftMint: new PublicKey('...'),
  maxPrice: 1.5, // Maximum price willing to pay in SOL
});
```

#### `useSellNft`
Sells NFTs back to the bonding curve (burns the NFT).

```typescript
import { useSellNft } from '@/hooks';

const { sellNft, canSellNft, estimateSellPrice, isLoading, error } = useSellNft();

// Check if NFT can be sold
const canSell = await canSellNft(nftMint);

// Estimate sell price
const estimatedPrice = await estimateSellPrice(nftMint);

// Sell the NFT
const signature = await sellNft({ nftMint });
```

### Bidding System

#### `useBidListing`
Lists NFTs for bidding and manages bid listings.

```typescript
import { useBidListing } from '@/hooks';

const { listForBids, cancelListing, getBidListing, isLoading, error } = useBidListing();

const listingAddress = await listForBids(nftMint, minBid, durationHours);
```

#### `useBidPlacement`
Places bids on listed NFTs.

```typescript
import { useBidPlacement } from '@/hooks';

const { placeBid, getBidInfo, isLoading, error } = useBidPlacement();

const bidAddress = await placeBid(nftMint, bidAmount, durationHours);
```

#### `useBidManagement`
Manages bid acceptance and cancellation.

```typescript
import { useBidManagement } from '@/hooks';

const { acceptBid, cancelBid, getUserBids, isLoading, error } = useBidManagement();

// Accept a bid
await acceptBid(bidId);

// Cancel a bid
await cancelBid(bidId);
```

### Collection Management

#### `useCollectionFees`
Distributes collection fees to NFT holders.

```typescript
import { useCollectionFees } from '@/hooks';

const { distributeCollectionFees, getCollectionDistribution, getPendingFees } = useCollectionFees();

// Distribute fees
const signature = await distributeCollectionFees({ collectionMint });

// Check pending fees
const pendingFees = await getPendingFees(collectionMint);
```

#### `useMigrateToTensor`
Migrates collections to Tensor marketplace when threshold is reached.

```typescript
import { useMigrateToTensor } from '@/hooks';

const { migrateToTensor, canMigrateToTensor, getMigrationProgress } = useMigrateToTensor();

// Check if migration is possible
const canMigrate = await canMigrateToTensor(collectionMint);

// Get migration progress
const progress = await getMigrationProgress(collectionMint);

// Migrate to Tensor
const signature = await migrateToTensor({ collectionMint });
```

### User Management

#### `useUserAccount`
Manages user account data and statistics.

```typescript
import { useUserAccount } from '@/hooks';

const { getUserAccount, createUserAccount, updateUserAccount } = useUserAccount();

const userAccount = await getUserAccount(userPublicKey);
```

### Transaction Management

#### `useTransactionIntegration`
Integrates with transaction history and provides unified transaction management.

#### `useBondingCurveHistory`
Provides historical data and analytics for bonding curve activities.

```typescript
import { useBondingCurveHistory } from '@/hooks';

const { getTradeHistory, getPriceHistory, getVolumeData } = useBondingCurveHistory();
```

## Error Handling

All hooks include standardized error handling:

```typescript
const { operation, isLoading, error } = useHook();

if (error) {
  console.error('Operation failed:', error);
}

if (isLoading) {
  // Show loading state
}
```

## TypeScript Support

All hooks are fully typed with TypeScript interfaces:

```typescript
interface CreatePoolParams {
  collectionMint: PublicKey;
  basePrice: number; // in SOL
  growthFactor?: number;
}

interface PoolInfo {
  address: PublicKey;
  collection: PublicKey;
  config: PoolConfig;
  stats: PoolStats;
  state: PoolState;
  bump: number;
}
```

## Usage Examples

### Complete NFT Collection Setup

```typescript
import { useCreateCollectionNft, useCreatePool, useMintNft } from '@/hooks';

const SetupCollection = () => {
  const { createCollectionNft } = useCreateCollectionNft();
  const { createPool } = useCreatePool();
  const { mintNft } = useMintNft();

  const setupCollection = async () => {
    // 1. Create collection NFT
    const collectionMint = await createCollectionNft({
      name: "My Collection",
      symbol: "MC",
      uri: "https://collection.metadata.uri",
    });

    // 2. Create bonding curve pool
    const poolAddress = await createPool({
      collectionMint,
      basePrice: 0.1,
    });

    // 3. Mint first NFT
    const nftMint = await mintNft({
      collectionMint,
      name: "NFT #1",
      symbol: "MC",
      uri: "https://nft1.metadata.uri",
    });

    return { collectionMint, poolAddress, nftMint };
  };

  return (
    <button onClick={setupCollection}>
      Setup Collection
    </button>
  );
};
```

### Trading NFTs

```typescript
import { useBuyNft, useSellNft, usePoolInfo } from '@/hooks';

const TradingInterface = ({ nftMint }: { nftMint: PublicKey }) => {
  const { buyNft, getCurrentPrice } = useBuyNft();
  const { sellNft, estimateSellPrice } = useSellNft();
  const { getPoolStats } = usePoolInfo();

  const handleBuy = async () => {
    const currentPrice = await getCurrentPrice(nftMint);
    await buyNft({ nftMint, maxPrice: currentPrice * 1.1 });
  };

  const handleSell = async () => {
    await sellNft({ nftMint });
  };

  return (
    <div>
      <button onClick={handleBuy}>Buy NFT</button>
      <button onClick={handleSell}>Sell NFT</button>
    </div>
  );
};
```

## Best Practices

1. **Error Handling**: Always check for errors before proceeding with operations
2. **Loading States**: Use loading states to provide user feedback
3. **Type Safety**: Use TypeScript types for better development experience
4. **Gas Optimization**: Batch operations when possible
5. **User Experience**: Provide clear feedback and confirmation dialogs

## Dependencies

- `@solana/wallet-adapter-react`
- `@solana/web3.js`
- `@coral-xyz/anchor`
- `@solana/spl-token`

## Program ID

The hooks are configured to work with program ID: `5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf`

Make sure this matches your deployed contract address.
