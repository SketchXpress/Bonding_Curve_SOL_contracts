use anchor_lang::prelude::*;

// Program ID - This will be replaced during deployment
declare_id!("11111111111111111111111111111112");

// === MODULE DECLARATIONS ===
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;
pub mod utils;

// === IMPORTS ===
use instructions::*;

/// SketchXpress Bonding Curve System
/// 
/// A revolutionary NFT marketplace that combines:
/// - Exponential bonding curves for price discovery
/// - Token-Owned Escrow (TOE) for guaranteed value backing
/// - Dynamic bidding system with premium validation
/// - Revenue distribution (95% to minter, 4% to platform, 1% to collection)
/// 
/// Key Features:
/// - Every NFT has intrinsic value backed by SOL escrow
/// - Bids must exceed bonding curve price + premium
/// - Original minters receive 95% of secondary sales
/// - Collection holders share 1% of all transactions
/// - Automatic migration to Tensor at 690 SOL market cap
#[program]
pub mod bonding_curve_system {
    use super::*;

    // === POOL MANAGEMENT ===

    /// Create a new bonding curve pool for a collection
    /// 
    /// This initializes the bonding curve parameters and sets up the pool
    /// for NFT minting with dynamic pricing.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Pool creation parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn create_pool(ctx: Context<CreatePool>, args: CreatePoolArgs) -> Result<()> {
        instructions::create_pool::create_pool(ctx, args)
    }

    // === NFT LIFECYCLE ===

    /// Create a collection NFT (master edition)
    /// 
    /// This creates the collection NFT that serves as the parent for all
    /// NFTs minted through the bonding curve.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Collection creation parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn create_collection_nft(
        ctx: Context<CreateCollectionNft>,
        args: CreateCollectionNftArgs,
    ) -> Result<()> {
        instructions::create_collection_nft::create_collection_nft(ctx, args)
    }

    /// Mint a new NFT through the bonding curve
    /// 
    /// This mints an NFT at the current bonding curve price, creates a
    /// Token-Owned Escrow account, and tracks the original minter.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Minting parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
        instructions::mint_nft::mint_nft(ctx, args)
    }

    /// Buy an NFT directly from the bonding curve
    /// 
    /// This allows purchasing an NFT at the current bonding curve price
    /// without going through the bidding system.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Purchase parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn buy_nft(ctx: Context<BuyNft>, args: BuyNftArgs) -> Result<()> {
        instructions::buy_nft::buy_nft(ctx, args)
    }

    /// Sell (burn) an NFT back to the bonding curve
    /// 
    /// This burns an NFT and returns the escrowed SOL to the holder,
    /// minus a small platform fee.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Sell parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn sell_nft(ctx: Context<SellNft>, args: SellNftArgs) -> Result<()> {
        instructions::sell_nft::sell_nft(ctx, args)
    }

    // === BIDDING SYSTEM ===

    /// List an NFT for bidding
    /// 
    /// This creates a bid listing that allows others to place bids on the NFT.
    /// The minimum bid is automatically set to bonding curve price + premium.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Listing parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn list_for_bids(ctx: Context<ListForBids>, args: ListForBidsArgs) -> Result<()> {
        instructions::list_for_bids::list_for_bids(ctx, args)
    }

    /// Place a bid on a listed NFT
    /// 
    /// This places a bid with SOL escrow. The bid must exceed the current
    /// bonding curve price plus the required premium.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Bid parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn place_bid(ctx: Context<PlaceBid>, args: PlaceBidArgs) -> Result<()> {
        instructions::place_bid::place_bid(ctx, args)
    }

    /// Accept a bid and execute the transaction
    /// 
    /// This accepts a bid, transfers the NFT to the bidder, and distributes
    /// the revenue: 95% to original minter, 4% to platform, 1% to collection.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Acceptance parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn accept_bid(ctx: Context<AcceptBid>, args: AcceptBidArgs) -> Result<()> {
        instructions::accept_bid::accept_bid(ctx, args)
    }

    /// Cancel a bid and refund the bidder
    /// 
    /// This cancels an active bid and returns the escrowed SOL to the bidder.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Cancellation parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn cancel_bid(ctx: Context<CancelBid>, args: CancelBidArgs) -> Result<()> {
        instructions::cancel_bid::cancel_bid(ctx, args)
    }

    // === COLLECTION FEES ===

    /// Distribute collection fees to NFT holders
    /// 
    /// This distributes the accumulated 1% collection fees proportionally
    /// to all NFT holders in the collection.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Distribution parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn distribute_collection_fees(
        ctx: Context<DistributeCollectionFees>,
        args: DistributeCollectionFeesArgs,
    ) -> Result<()> {
        instructions::distribute_collection_fees::distribute_collection_fees(ctx, args)
    }

    // === MIGRATION ===

    /// Migrate the collection to Tensor marketplace
    /// 
    /// This migrates the collection to Tensor when the market cap reaches
    /// the threshold (690 SOL), providing liquidity and advanced trading features.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Migration parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn migrate_to_tensor(
        ctx: Context<MigrateToTensor>,
        args: MigrateToTensorArgs,
    ) -> Result<()> {
        instructions::migrate_to_tensor::migrate_to_tensor(ctx, args)
    }

    // === ADMIN FUNCTIONS ===

    /// Update pool configuration (admin only)
    /// 
    /// This allows the pool creator to update certain parameters like
    /// pricing configuration and fee structures.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Update parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        args: UpdatePoolConfigArgs,
    ) -> Result<()> {
        instructions::update_pool_config::update_pool_config(ctx, args)
    }

    /// Emergency pause/unpause (admin only)
    /// 
    /// This allows pausing the pool in case of emergencies or maintenance.
    /// 
    /// # Arguments
    /// * `ctx` - Program context with required accounts
    /// * `args` - Pause parameters
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn emergency_pause(ctx: Context<EmergencyPause>, args: EmergencyPauseArgs) -> Result<()> {
        instructions::emergency_pause::emergency_pause(ctx, args)
    }
}

// === PROGRAM METADATA ===

/// Program version for compatibility tracking
pub const PROGRAM_VERSION: &str = "1.0.0";

/// Program name for identification
pub const PROGRAM_NAME: &str = "SketchXpress Bonding Curve System";

/// Program description
pub const PROGRAM_DESCRIPTION: &str = 
    "Revolutionary NFT marketplace with bonding curves, Token-Owned Escrow, and dynamic bidding";

// === PROGRAM CONFIGURATION ===

/// Default configuration for new pools
pub mod default_config {
    use crate::state::types::*;

    /// Default bonding curve parameters
    pub fn bonding_curve_params() -> BondingCurveParams {
        BondingCurveParams {
            base_price: 100_000_000,      // 0.1 SOL
            growth_factor: 1100,          // 10% growth
            max_supply: 1000,             // 1000 NFTs max
            migration_threshold: 690_000_000_000, // 690 SOL
        }
    }

    /// Default dynamic pricing configuration
    pub fn dynamic_pricing_config() -> DynamicPricingConfig {
        DynamicPricingConfig {
            minimum_premium_bp: 1000,     // 10% minimum premium
            bid_increment_bp: 500,        // 5% bid increment
            max_bid_duration: 604800,     // 1 week max
            min_bid_duration: 3600,       // 1 hour min
        }
    }

    /// Default revenue distribution
    pub fn revenue_distribution() -> RevenueDistribution {
        RevenueDistribution {
            minter_percentage: 9500,      // 95% to minter
            platform_percentage: 400,    // 4% to platform
            collection_percentage: 100,   // 1% to collection
        }
    }
}

// === PROGRAM EVENTS ===

/// Global program events for analytics and monitoring
#[event]
pub struct ProgramInitializedEvent {
    pub program_id: Pubkey,
    pub version: String,
    pub timestamp: i64,
}

#[event]
pub struct PoolCreatedEvent {
    pub pool: Pubkey,
    pub collection: Pubkey,
    pub creator: Pubkey,
    pub base_price: u64,
    pub growth_factor: u16,
    pub timestamp: i64,
}

#[event]
pub struct NftMintedEvent {
    pub nft_mint: Pubkey,
    pub minter: Pubkey,
    pub price: u64,
    pub supply: u32,
    pub escrow_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct BidSystemTransactionEvent {
    pub transaction_type: String,
    pub nft_mint: Pubkey,
    pub amount: u64,
    pub participants: Vec<Pubkey>,
    pub revenue_distribution: Option<(u64, u64, u64)>, // (minter, platform, collection)
    pub timestamp: i64,
}

#[event]
pub struct CollectionMigratedEvent {
    pub collection: Pubkey,
    pub final_market_cap: u64,
    pub final_supply: u32,
    pub migration_timestamp: i64,
}

// === PROGRAM UTILITIES ===

/// Get program version
pub fn get_program_version() -> &'static str {
    PROGRAM_VERSION
}

/// Get program configuration
pub fn get_program_info() -> ProgramInfo {
    ProgramInfo {
        name: PROGRAM_NAME.to_string(),
        description: PROGRAM_DESCRIPTION.to_string(),
        version: PROGRAM_VERSION.to_string(),
        id: crate::ID,
    }
}

/// Program information structure
#[derive(Debug, Clone)]
pub struct ProgramInfo {
    pub name: String,
    pub description: String,
    pub version: String,
    pub id: Pubkey,
}

// === PROGRAM VALIDATION ===

/// Validate program state on initialization
pub fn validate_program_state() -> Result<()> {
    // Validate default configurations
    default_config::bonding_curve_params().validate()?;
    default_config::revenue_distribution().validate()?;
    
    // Emit initialization event
    emit!(ProgramInitializedEvent {
        program_id: crate::ID,
        version: PROGRAM_VERSION.to_string(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_program_info() {
        let info = get_program_info();
        assert_eq!(info.name, PROGRAM_NAME);
        assert_eq!(info.version, PROGRAM_VERSION);
        assert!(!info.description.is_empty());
    }

    #[test]
    fn test_default_configs() {
        let curve_params = default_config::bonding_curve_params();
        assert!(curve_params.base_price > 0);
        assert!(curve_params.growth_factor > 10000); // > 100%

        let pricing_config = default_config::dynamic_pricing_config();
        assert!(pricing_config.minimum_premium_bp > 0);
        assert!(pricing_config.bid_increment_bp > 0);

        let revenue_dist = default_config::revenue_distribution();
        assert_eq!(
            revenue_dist.minter_percentage + 
            revenue_dist.platform_percentage + 
            revenue_dist.collection_percentage,
            10000 // 100%
        );
    }

    #[test]
    fn test_program_validation() {
        // This should not panic
        assert!(validate_program_state().is_ok());
    }
}

