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

/// Revenue distribution percentages
pub struct RevenueDistribution;

impl RevenueDistribution {
    /// Percentage that goes to the original minter (95%)
    pub const MINTER_PERCENTAGE: u64 = 95;
    
    /// Percentage that goes to the platform (4%)
    pub const PLATFORM_PERCENTAGE: u64 = 4;
    
    /// Percentage that goes to collection holders (1%)
    pub const COLLECTION_PERCENTAGE: u64 = 1;
    
    /// Calculate revenue shares from a total amount
    pub fn calculate_shares(total_amount: u64) -> Result<(u64, u64, u64)> {
        let minter_share = total_amount
            .checked_mul(Self::MINTER_PERCENTAGE)
            .and_then(|x| x.checked_div(100))
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let platform_share = total_amount
            .checked_mul(Self::PLATFORM_PERCENTAGE)
            .and_then(|x| x.checked_div(100))
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let collection_share = total_amount
            .checked_mul(Self::COLLECTION_PERCENTAGE)
            .and_then(|x| x.checked_div(100))
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        // Verify total doesn't exceed original amount
        let total_distributed = minter_share
            .checked_add(platform_share)
            .and_then(|x| x.checked_add(collection_share))
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        if total_distributed > total_amount {
            return Err(crate::errors::ErrorCode::RevenueDistributionFailed.into());
        }

        Ok((minter_share, platform_share, collection_share))
    }
}

/// Common validation functions
pub struct Validation;

impl Validation {
    /// Validates that a timestamp is not expired
    pub fn is_not_expired(expires_at: i64, current_time: i64) -> bool {
        expires_at == 0 || current_time < expires_at
    }
    
    /// Validates that an amount is greater than zero
    pub fn is_positive_amount(amount: u64) -> bool {
        amount > 0
    }
    
    /// Validates that a bid amount meets minimum requirements
    pub fn meets_minimum_bid(bid_amount: u64, min_bid: u64, current_highest: u64) -> bool {
        if current_highest > 0 {
            // Must be at least 5% higher than current highest bid
            let min_required = current_highest
                .checked_mul(105)
                .and_then(|x| x.checked_div(100))
                .unwrap_or(u64::MAX);
            bid_amount >= min_required
        } else {
            bid_amount >= min_bid
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revenue_distribution() {
        let total = 1_000_000_000; // 1 SOL
        let (minter, platform, collection) = RevenueDistribution::calculate_shares(total).unwrap();
        
        assert_eq!(minter, 950_000_000); // 0.95 SOL
        assert_eq!(platform, 40_000_000); // 0.04 SOL
        assert_eq!(collection, 10_000_000); // 0.01 SOL
        assert_eq!(minter + platform + collection, total);
    }

    #[test]
    fn test_bid_validation() {
        assert!(Validation::meets_minimum_bid(100, 50, 0)); // First bid above minimum
        assert!(!Validation::meets_minimum_bid(40, 50, 0)); // First bid below minimum
        assert!(Validation::meets_minimum_bid(105, 50, 100)); // 5% higher than current
        assert!(!Validation::meets_minimum_bid(104, 50, 100)); // Less than 5% higher
    }

    #[test]
    fn test_expiry_validation() {
        let current_time = 1000;
        assert!(Validation::is_not_expired(0, current_time)); // No expiry
        assert!(Validation::is_not_expired(1001, current_time)); // Future expiry
        assert!(!Validation::is_not_expired(999, current_time)); // Past expiry
    }
}

