// Constants for the bonding curve system
pub const PRECISION: u64 = 1_000_000; // 6 decimal precision
pub const GROWTH_FACTOR_PRECISION: u64 = 100_000_000_000; // Higher precision for small growth factor
pub const DEFAULT_GROWTH_FACTOR: u64 = 3606; // 0.00003606 * GROWTH_FACTOR_PRECISION
pub const THRESHOLD_MARKET_CAP: u64 = 690 * PRECISION;
// $69k market cap threshold

// Fee structure constants
pub const MINT_FEE_PERCENTAGE: u64 = 1; // 1% platform fee for minting
pub const CREATOR_ROYALTY_PERCENTAGE: u64 = 5; // 5% creator royalty for secondary sales
pub const SECONDARY_BURN_PERCENTAGE: u64 = 15; // 1.5% burn for secondary sales (scaled by 10)
pub const SECONDARY_DISTRIBUTE_PERCENTAGE: u64 = 15; // 1.5% distribute to holders for secondary sales (scaled by 10)
pub const BUYBACK_BURN_PERCENTAGE: u64 = 25; // 2.5% burn for buybacks (scaled by 10)
pub const BUYBACK_DISTRIBUTE_PERCENTAGE: u64 = 25; // 2.5% distribute to holders for buybacks (scaled by 10)
