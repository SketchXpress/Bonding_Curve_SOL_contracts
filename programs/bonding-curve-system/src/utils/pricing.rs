use anchor_lang::prelude::*;
use crate::state::{BondingCurvePool, BidListing};
use crate::math::bonding_curve::BondingCurve;

/// Dynamic pricing utilities for the bidding system
pub struct DynamicPricing;

impl DynamicPricing {
    /// Calculate the current bonding curve price for an NFT
    pub fn get_current_bonding_curve_price(
        pool: &Account<BondingCurvePool>,
    ) -> Result<u64> {
        // Get the current price based on supply
        let current_price = BondingCurve::calculate_price(
            pool.base_price,
            pool.growth_factor,
            pool.current_supply,
        )?;

        Ok(current_price)
    }

    /// Calculate minimum bid required (must be higher than bonding curve price)
    pub fn calculate_minimum_bid_required(
        pool: &Account<BondingCurvePool>,
        premium_percentage: u64, // e.g., 10 for 10% premium
    ) -> Result<u64> {
        let bonding_curve_price = Self::get_current_bonding_curve_price(pool)?;
        
        // Add premium to bonding curve price
        let minimum_bid = bonding_curve_price
            .checked_mul(100 + premium_percentage)
            .and_then(|x| x.checked_div(100))
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        Ok(minimum_bid)
    }

    /// Validate that a bid meets the dynamic minimum requirements
    pub fn validate_dynamic_bid_amount(
        bid_amount: u64,
        pool: &Account<BondingCurvePool>,
        current_highest_bid: u64,
        minimum_premium_percentage: u64, // Default: 10% above bonding curve
        bid_increment_percentage: u64,   // Default: 5% above current highest
    ) -> Result<()> {
        // Calculate minimum bid based on bonding curve price
        let bonding_curve_minimum = Self::calculate_minimum_bid_required(
            pool, 
            minimum_premium_percentage
        )?;

        if current_highest_bid > 0 {
            // If there's already a bid, new bid must be higher
            let minimum_increment = current_highest_bid
                .checked_mul(100 + bid_increment_percentage)
                .and_then(|x| x.checked_div(100))
                .ok_or(crate::errors::ErrorCode::MathOverflow)?;

            // Use the higher of the two minimums
            let required_minimum = std::cmp::max(bonding_curve_minimum, minimum_increment);

            require!(
                bid_amount >= required_minimum,
                crate::errors::ErrorCode::BidTooLow
            );
        } else {
            // First bid must be above bonding curve price + premium
            require!(
                bid_amount >= bonding_curve_minimum,
                crate::errors::ErrorCode::BidBelowBondingCurve
            );
        }

        Ok(())
    }

    /// Calculate the value proposition for bidders
    pub fn calculate_bid_value_analysis(
        bid_amount: u64,
        pool: &Account<BondingCurvePool>,
    ) -> Result<BidValueAnalysis> {
        let bonding_curve_price = Self::get_current_bonding_curve_price(pool)?;
        let premium_amount = bid_amount.saturating_sub(bonding_curve_price);
        let premium_percentage = if bonding_curve_price > 0 {
            premium_amount
                .checked_mul(100)
                .and_then(|x| x.checked_div(bonding_curve_price))
                .unwrap_or(0)
        } else {
            0
        };

        Ok(BidValueAnalysis {
            bid_amount,
            bonding_curve_price,
            premium_amount,
            premium_percentage,
            is_profitable: bid_amount > bonding_curve_price,
        })
    }

    /// Update listing minimum bid based on current bonding curve price
    pub fn update_listing_minimum_bid(
        listing: &mut Account<BidListing>,
        pool: &Account<BondingCurvePool>,
        premium_percentage: u64,
    ) -> Result<()> {
        let new_minimum = Self::calculate_minimum_bid_required(pool, premium_percentage)?;
        
        // Only update if the new minimum is higher
        if new_minimum > listing.min_bid {
            listing.min_bid = new_minimum;
            listing.last_price_update = Clock::get()?.unix_timestamp;
        }

        Ok(())
    }

    /// Calculate expected returns for different scenarios
    pub fn calculate_expected_returns(
        bid_amount: u64,
        pool: &Account<BondingCurvePool>,
        time_horizon_hours: u32,
    ) -> Result<ExpectedReturns> {
        let current_price = Self::get_current_bonding_curve_price(pool)?;
        
        // Estimate future price based on growth factor and time
        let estimated_growth = Self::estimate_price_growth(
            pool, 
            time_horizon_hours
        )?;

        let future_estimated_price = current_price
            .checked_mul(100 + estimated_growth)
            .and_then(|x| x.checked_div(100))
            .unwrap_or(current_price);

        let potential_profit = future_estimated_price.saturating_sub(bid_amount);
        let roi_percentage = if bid_amount > 0 {
            potential_profit
                .checked_mul(100)
                .and_then(|x| x.checked_div(bid_amount))
                .unwrap_or(0)
        } else {
            0
        };

        Ok(ExpectedReturns {
            current_bonding_curve_price: current_price,
            estimated_future_price: future_estimated_price,
            potential_profit,
            roi_percentage,
            time_horizon_hours,
        })
    }

    /// Estimate price growth based on historical data and growth factor
    fn estimate_price_growth(
        pool: &Account<BondingCurvePool>,
        time_horizon_hours: u32,
    ) -> Result<u64> {
        // Simple estimation based on growth factor
        // In a real implementation, you'd use historical data
        let base_growth_per_hour = pool.growth_factor
            .checked_div(100)
            .unwrap_or(1);

        let estimated_growth = base_growth_per_hour
            .checked_mul(time_horizon_hours as u64)
            .unwrap_or(0);

        // Cap at reasonable maximum (e.g., 1000%)
        Ok(std::cmp::min(estimated_growth, 1000))
    }
}

/// Analysis of bid value compared to bonding curve
#[derive(Debug, Clone)]
pub struct BidValueAnalysis {
    pub bid_amount: u64,
    pub bonding_curve_price: u64,
    pub premium_amount: u64,
    pub premium_percentage: u64,
    pub is_profitable: bool,
}

/// Expected returns calculation
#[derive(Debug, Clone)]
pub struct ExpectedReturns {
    pub current_bonding_curve_price: u64,
    pub estimated_future_price: u64,
    pub potential_profit: u64,
    pub roi_percentage: u64,
    pub time_horizon_hours: u32,
}

/// Dynamic pricing configuration
#[derive(Debug, Clone)]
pub struct DynamicPricingConfig {
    /// Minimum premium above bonding curve price (default: 10%)
    pub minimum_premium_percentage: u64,
    /// Required increment above current highest bid (default: 5%)
    pub bid_increment_percentage: u64,
    /// Maximum bid duration in hours (default: 168 = 1 week)
    pub max_bid_duration_hours: u32,
    /// Minimum bid duration in hours (default: 1)
    pub min_bid_duration_hours: u32,
}

impl Default for DynamicPricingConfig {
    fn default() -> Self {
        Self {
            minimum_premium_percentage: 10, // 10% above bonding curve
            bid_increment_percentage: 5,    // 5% above current highest
            max_bid_duration_hours: 168,    // 1 week
            min_bid_duration_hours: 1,      // 1 hour
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dynamic_pricing_calculation() {
        // Mock pool data
        let base_price = 100_000_000; // 0.1 SOL
        let growth_factor = 110; // 10% growth
        let current_supply = 10;

        // Calculate expected price
        let expected_price = base_price * (growth_factor.pow(current_supply as u32)) / (100_u64.pow(current_supply as u32));
        
        // Test minimum bid calculation
        let premium_percentage = 10;
        let expected_minimum = expected_price * (100 + premium_percentage) / 100;
        
        assert!(expected_minimum > expected_price);
    }

    #[test]
    fn test_bid_value_analysis() {
        let bid_amount = 1_100_000_000; // 1.1 SOL
        let bonding_curve_price = 1_000_000_000; // 1 SOL
        
        let premium_amount = bid_amount - bonding_curve_price;
        let premium_percentage = (premium_amount * 100) / bonding_curve_price;
        
        assert_eq!(premium_amount, 100_000_000); // 0.1 SOL premium
        assert_eq!(premium_percentage, 10); // 10% premium
    }
}

