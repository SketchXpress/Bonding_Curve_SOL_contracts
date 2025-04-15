// Constants for the bonding curve system
pub const PRECISION: u64 = 1_000_000; // 6 decimal precision
pub const GROWTH_FACTOR_PRECISION: u64 = 100_000_000_000; // Higher precision for small growth factor
pub const DEFAULT_GROWTH_FACTOR: u64 = 3606; // 0.00003606 * GROWTH_FACTOR_PRECISION
pub const THRESHOLD_MARKET_CAP: u64 = 69_000 * PRECISION; // $69k market cap threshold
pub const PLATFORM_FEE_PERCENTAGE: u64 = 2; // 2% platform fee
