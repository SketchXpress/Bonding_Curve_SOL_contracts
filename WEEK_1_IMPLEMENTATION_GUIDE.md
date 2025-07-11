# SketchXpress Week 1 Implementation Guide

## Overview
This guide documents all the Week 1 tasks completed for the SketchXpress bidding system implementation. All new account structures, updated instructions, and basic bidding functionality have been implemented.

## ✅ Completed Tasks

### 1. New Account Structures (4 files created)
- **BidListing** - Manages NFT listings for bidding
- **Bid** - Individual bid management with escrow
- **MinterTracker** - Tracks original minter for revenue distribution
- **CollectionDistribution** - Manages collection-wide fee distribution

### 2. Updated Existing Files
- **mint_nft.rs** - Enhanced with minter tracking
- **state/mod.rs** - Added new account imports
- **instructions/mod.rs** - Added new instruction modules
- **errors.rs** - Added bidding-specific error codes
- **constants.rs** - Added bidding system constants
- **lib.rs** - Added new instruction endpoints

### 3. New Bidding Instructions (3 files created)
- **list_for_bids.rs** - List NFT for bidding
- **place_bid.rs** - Place bids with SOL escrow
- **cancel_bid.rs** - Cancel active bids

## 📁 Files to Update in Original Repository

### New Files to Add:

#### State Files (Add to `src/state/`):
1. `bid_listing.rs` - BidListing account structure
2. `bid.rs` - Bid account structure  
3. `minter_tracker.rs` - MinterTracker account structure
4. `collection_distribution.rs` - CollectionDistribution account structure

#### Instruction Files (Add to `src/instructions/`):
1. `list_for_bids.rs` - List NFT for bidding instruction
2. `place_bid.rs` - Place bid instruction
3. `cancel_bid.rs` - Cancel bid instruction

### Files to Update:

#### 1. `src/state/mod.rs`
**ADD these lines:**
```rust
pub mod bid_listing;
pub mod bid;
pub mod minter_tracker;
pub mod collection_distribution;

pub use bid_listing::*;
pub use bid::*;
pub use minter_tracker::*;
pub use collection_distribution::*;
```

#### 2. `src/instructions/mod.rs`
**ADD these lines:**
```rust
// New bidding system instructions
pub mod list_for_bids;
pub mod place_bid;
pub mod cancel_bid;
```

#### 3. `src/errors.rs`
**ADD these error codes:**
```rust
// New bidding system errors
#[msg("Invalid bid amount")]
InvalidBidAmount,

#[msg("Bid too low")]
BidTooLow,

#[msg("Bid listing not active")]
BidListingNotActive,

#[msg("Bid listing expired")]
BidListingExpired,

#[msg("Cannot bid on own listing")]
CannotBidOnOwnListing,

#[msg("Insufficient NFT balance")]
InsufficientNftBalance,

#[msg("Unauthorized bid cancellation")]
UnauthorizedBidCancellation,

#[msg("Cannot cancel bid")]
CannotCancelBid,

#[msg("Bid not found")]
BidNotFound,

#[msg("Cannot accept bid")]
CannotAcceptBid,

#[msg("Unauthorized bid acceptance")]
UnauthorizedBidAcceptance,

#[msg("Revenue distribution failed")]
RevenueDistributionFailed,
```

#### 4. `src/constants.rs`
**ADD these constants:**
```rust
// Bidding system constants
pub const MINTER_REVENUE_PERCENTAGE: u64 = 95; // 95% goes to original minter
pub const PLATFORM_REVENUE_PERCENTAGE: u64 = 4; // 4% goes to platform
pub const COLLECTION_REVENUE_PERCENTAGE: u64 = 1; // 1% goes to collection holders

// Bidding time limits
pub const MAX_BID_DURATION_HOURS: u32 = 168; // 7 days maximum
pub const MIN_BID_DURATION_HOURS: u32 = 1; // 1 hour minimum
pub const DEFAULT_BID_DURATION_HOURS: u32 = 24; // 24 hours default

// Minimum bid increments
pub const MIN_BID_INCREMENT_PERCENTAGE: u64 = 5; // 5% minimum increase over previous bid
pub const MIN_BID_AMOUNT: u64 = 1_000_000; // 0.001 SOL minimum bid (1M lamports)
```

#### 5. `src/lib.rs`
**ADD these imports:**
```rust
// New bidding system imports
use instructions::list_for_bids::*;
use instructions::place_bid::*;
use instructions::cancel_bid::*;
```

**ADD these instruction endpoints:**
```rust
// NEW BIDDING SYSTEM INSTRUCTIONS

// Lists an NFT for bidding
pub fn list_for_bids(
    ctx: Context<ListForBids>,
    min_bid: u64,
    duration_hours: Option<u32>,
) -> Result<()> {
    instructions::list_for_bids::list_for_bids(ctx, min_bid, duration_hours)
}

// Places a bid on a listed NFT
pub fn place_bid(
    ctx: Context<PlaceBid>,
    args: instructions::place_bid::PlaceBidArgs,
) -> Result<()> {
    instructions::place_bid::place_bid(ctx, args)
}

// Cancels an active bid
pub fn cancel_bid(
    ctx: Context<CancelBid>,
    bid_id: u64,
) -> Result<()> {
    instructions::cancel_bid::cancel_bid(ctx, bid_id)
}
```

#### 6. `src/instructions/mint_nft.rs`
**REPLACE the entire file with the updated version** that includes:
- MinterTracker initialization
- CollectionDistribution initialization
- Enhanced account structure with new accounts

## 🔧 Key Implementation Details

### Account Structure Changes
1. **MinterTracker** - Links each NFT to its original minter for revenue distribution
2. **BidListing** - Manages active NFT listings with expiry and status tracking
3. **Bid** - Individual bids with SOL escrow and status management
4. **CollectionDistribution** - Accumulates and distributes collection fees

### Revenue Distribution Model
- **95%** → Original Minter's Wallet
- **4%** → Platform Wallet  
- **1%** → All NFT Holders in Collection

### Security Features
- Bid escrow management prevents fund loss
- Authorization checks prevent unauthorized operations
- Expiry mechanisms prevent stale listings/bids
- Self-bidding prevention

### Event Emissions
- `NftListedForBids` - When NFT is listed
- `BidPlaced` - When bid is placed
- `BidCancelled` - When bid is cancelled
- `NftMint` - Enhanced with minter tracking

## 🚀 Next Steps (Week 2)

### Still to Implement:
1. **accept_bid.rs** - Accept bid and execute revenue distribution
2. **distribute_collection_fees.rs** - Distribute accumulated collection fees
3. **Enhanced error handling** - More robust error scenarios
4. **Bid expiry automation** - Automatic bid cleanup
5. **Integration testing** - Comprehensive test suite

### Frontend Integration Required:
1. **BidListingCard.tsx** - UI for listing NFTs
2. **BidPlacementCard.tsx** - UI for placing bids
3. **BidManagementCard.tsx** - UI for managing bids
4. **useBidListing.ts** - React hook for listing
5. **useBidPlacement.ts** - React hook for bidding

## 📋 Testing Checklist

Before deploying, test these flows:
- [ ] NFT minting with minter tracking
- [ ] NFT listing for bids
- [ ] Bid placement with escrow
- [ ] Bid cancellation with refund
- [ ] Multiple bids on same NFT
- [ ] Expired listing handling
- [ ] Self-bidding prevention
- [ ] Authorization checks

## 🔍 Code Quality Notes

- All new code follows Anchor best practices
- Comprehensive error handling implemented
- Event emissions for frontend integration
- PDA derivation for account security
- Proper account space calculations
- Consistent naming conventions

## 📞 Support

For questions about this implementation:
1. Review the individual file comments
2. Check error codes in `errors.rs`
3. Verify account structures in `state/` files
4. Test instruction flows in `instructions/` files

**Week 1 Status: ✅ COMPLETED**
**Ready for Week 2 Implementation**

