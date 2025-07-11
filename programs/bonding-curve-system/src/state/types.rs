use anchor_lang::prelude::*;

/// Status of a bid listing
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BidListingStatus {
    /// Listing is active and accepting bids
    Active,
    /// A bid has been accepted and NFT transferred
    Accepted,
    /// Listing was cancelled by the owner
    Cancelled,
    /// Listing has expired
    Expired,
}

impl Default for BidListingStatus {
    fn default() -> Self {
        Self::Active
    }
}

/// Status of an individual bid
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum BidStatus {
    /// Bid is active and can be accepted
    Active,
    /// Bid has been accepted
    Accepted,
    /// Bid was cancelled by the bidder
    Cancelled,
    /// Bid has expired
    Expired,
    /// Bid was outbid by a higher bid
    Outbid,
}

impl Default for BidStatus {
    fn default() -> Self {
        Self::Active
    }
}

/// Revenue distribution configuration for the bidding system
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevenueDistribution {
    /// Percentage to original minter (basis points, e.g., 9500 = 95%)
    pub minter_percentage: u16,
    /// Percentage to platform (basis points, e.g., 400 = 4%)
    pub platform_percentage: u16,
    /// Percentage to collection holders (basis points, e.g., 100 = 1%)
    pub collection_percentage: u16,
}

impl Default for RevenueDistribution {
    fn default() -> Self {
        Self {
            minter_percentage: 9500, // 95%
            platform_percentage: 400, // 4%
            collection_percentage: 100, // 1%
        }
    }
}

impl RevenueDistribution {
    /// Validate that percentages add up to 100%
    pub fn validate(&self) -> Result<()> {
        let total = self.minter_percentage + self.platform_percentage + self.collection_percentage;
        require_eq!(total, 10000, crate::errors::ErrorCode::InvalidRevenueSplit);
        Ok(())
    }

    /// Calculate revenue shares from total amount
    pub fn calculate_shares(&self, total_amount: u64) -> Result<(u64, u64, u64)> {
        self.validate()?;

        let minter_share = (total_amount as u128)
            .checked_mul(self.minter_percentage as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let platform_share = (total_amount as u128)
            .checked_mul(self.platform_percentage as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let collection_share = (total_amount as u128)
            .checked_mul(self.collection_percentage as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        Ok((minter_share, platform_share, collection_share))
    }
}

/// Dynamic pricing configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DynamicPricingConfig {
    /// Minimum premium above bonding curve price (basis points)
    pub minimum_premium_bp: u16,
    /// Required increment above current highest bid (basis points)
    pub bid_increment_bp: u16,
    /// Maximum bid duration in seconds
    pub max_bid_duration: i64,
    /// Minimum bid duration in seconds
    pub min_bid_duration: i64,
}

impl Default for DynamicPricingConfig {
    fn default() -> Self {
        Self {
            minimum_premium_bp: 1000, // 10%
            bid_increment_bp: 500,    // 5%
            max_bid_duration: 604800, // 1 week
            min_bid_duration: 3600,   // 1 hour
        }
    }
}

/// Bonding curve parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BondingCurveParams {
    /// Base price for the first NFT
    pub base_price: u64,
    /// Growth factor (basis points, e.g., 1100 = 10% growth)
    pub growth_factor: u16,
    /// Maximum supply before migration
    pub max_supply: u32,
    /// Market cap threshold for migration (in lamports)
    pub migration_threshold: u64,
}

impl Default for BondingCurveParams {
    fn default() -> Self {
        Self {
            base_price: 100_000_000, // 0.1 SOL
            growth_factor: 1100,     // 10% growth
            max_supply: 1000,        // 1000 NFTs max
            migration_threshold: 690_000_000_000, // 690 SOL
        }
    }
}

/// Collection metadata for fee distribution
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CollectionMetadata {
    /// Collection name
    pub name: String,
    /// Collection symbol
    pub symbol: String,
    /// Collection description
    pub description: String,
    /// Collection image URI
    pub image: String,
    /// External URL
    pub external_url: Option<String>,
    /// Collection creator
    pub creator: Pubkey,
    /// Royalty percentage (basis points)
    pub royalty_bp: u16,
}

/// Bid validation result
#[derive(Debug, Clone)]
pub struct BidValidationResult {
    pub is_valid: bool,
    pub required_amount: u64,
    pub bonding_curve_price: u64,
    pub premium_percentage: u64,
    pub error_message: Option<String>,
}

/// Price analysis for a bid
#[derive(Debug, Clone)]
pub struct BidPriceAnalysis {
    pub bid_amount: u64,
    pub bonding_curve_price: u64,
    pub premium_amount: u64,
    pub premium_percentage: u64,
    pub is_profitable: bool,
    pub market_position: MarketPosition,
}

/// Market position relative to bonding curve
#[derive(Debug, Clone, PartialEq)]
pub enum MarketPosition {
    BelowCurve,
    AtCurve,
    AboveCurve,
}

/// Transaction fee breakdown
#[derive(Debug, Clone)]
pub struct FeeBreakdown {
    pub total_amount: u64,
    pub minter_fee: u64,
    pub platform_fee: u64,
    pub collection_fee: u64,
    pub gas_estimate: u64,
}

/// Constants for the protocol
pub mod constants {
    /// Maximum number of active bids per NFT
    pub const MAX_BIDS_PER_NFT: u32 = 100;
    
    /// Maximum listing duration (1 week)
    pub const MAX_LISTING_DURATION: i64 = 604800;
    
    /// Minimum listing duration (1 hour)
    pub const MIN_LISTING_DURATION: i64 = 3600;
    
    /// Default bid increment (5%)
    pub const DEFAULT_BID_INCREMENT_BP: u16 = 500;
    
    /// Default minimum premium (10%)
    pub const DEFAULT_MINIMUM_PREMIUM_BP: u16 = 1000;
    
    /// Maximum premium allowed (1000%)
    pub const MAX_PREMIUM_BP: u16 = 100000;
    
    /// Basis points denominator
    pub const BASIS_POINTS: u64 = 10000;
    
    /// Lamports per SOL
    pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revenue_distribution_calculation() {
        let distribution = RevenueDistribution::default();
        let total = 1_000_000_000; // 1 SOL
        
        let (minter, platform, collection) = distribution.calculate_shares(total).unwrap();
        
        assert_eq!(minter, 950_000_000); // 0.95 SOL
        assert_eq!(platform, 40_000_000); // 0.04 SOL
        assert_eq!(collection, 10_000_000); // 0.01 SOL
        assert_eq!(minter + platform + collection, total);
    }

    #[test]
    fn test_revenue_distribution_validation() {
        let mut distribution = RevenueDistribution::default();
        assert!(distribution.validate().is_ok());
        
        distribution.minter_percentage = 9000; // Total would be 9500, not 10000
        assert!(distribution.validate().is_err());
    }

    #[test]
    fn test_dynamic_pricing_config() {
        let config = DynamicPricingConfig::default();
        assert_eq!(config.minimum_premium_bp, 1000); // 10%
        assert_eq!(config.bid_increment_bp, 500); // 5%
    }
}

