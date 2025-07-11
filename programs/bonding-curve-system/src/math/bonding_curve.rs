use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

/// Bonding curve mathematical operations
pub struct BondingCurve;

impl BondingCurve {
    /// Calculate the price for a specific NFT position in the bonding curve
    /// 
    /// Formula: price = base_price * (growth_factor / 10000) ^ supply
    /// 
    /// # Arguments
    /// * `base_price` - The base price for the first NFT (in lamports)
    /// * `growth_factor` - Growth factor in basis points (e.g., 1100 = 10% growth)
    /// * `supply` - Current supply (0-indexed, so 0 = first NFT)
    /// 
    /// # Returns
    /// * `Result<u64>` - The price in lamports
    pub fn calculate_price(
        base_price: u64,
        growth_factor: u16,
        supply: u32,
    ) -> Result<u64> {
        require!(base_price > 0, ErrorCode::InvalidAmount);
        require!(growth_factor > 0, ErrorCode::InvalidAmount);

        if supply == 0 {
            return Ok(base_price);
        }

        // Convert growth factor from basis points to decimal
        let growth_decimal = growth_factor as f64 / 10000.0;
        
        // Calculate: base_price * growth_factor^supply
        let price_f64 = (base_price as f64) * growth_decimal.powi(supply as i32);
        
        // Check for overflow
        if price_f64 > u64::MAX as f64 {
            return Err(ErrorCode::MathOverflow.into());
        }
        
        Ok(price_f64 as u64)
    }

    /// Calculate the total market cap for a given supply
    /// 
    /// This sums up all individual NFT prices from 0 to supply-1
    /// 
    /// # Arguments
    /// * `base_price` - The base price for the first NFT
    /// * `growth_factor` - Growth factor in basis points
    /// * `supply` - Total supply to calculate market cap for
    /// 
    /// # Returns
    /// * `Result<u64>` - Total market cap in lamports
    pub fn calculate_market_cap(
        base_price: u64,
        growth_factor: u16,
        supply: u32,
    ) -> Result<u64> {
        if supply == 0 {
            return Ok(0);
        }

        let mut total_value = 0u64;
        
        for i in 0..supply {
            let price = Self::calculate_price(base_price, growth_factor, i)?;
            total_value = total_value
                .checked_add(price)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        Ok(total_value)
    }

    /// Calculate the price difference between two supply levels
    /// 
    /// Useful for calculating how much the price increases when minting multiple NFTs
    /// 
    /// # Arguments
    /// * `base_price` - The base price for the first NFT
    /// * `growth_factor` - Growth factor in basis points
    /// * `from_supply` - Starting supply
    /// * `to_supply` - Ending supply
    /// 
    /// # Returns
    /// * `Result<u64>` - Price difference in lamports
    pub fn calculate_price_difference(
        base_price: u64,
        growth_factor: u16,
        from_supply: u32,
        to_supply: u32,
    ) -> Result<u64> {
        require!(to_supply >= from_supply, ErrorCode::InvalidAmount);

        if from_supply == to_supply {
            return Ok(0);
        }

        let from_price = Self::calculate_price(base_price, growth_factor, from_supply)?;
        let to_price = Self::calculate_price(base_price, growth_factor, to_supply)?;

        to_price
            .checked_sub(from_price)
            .ok_or(ErrorCode::MathUnderflow.into())
    }

    /// Calculate the supply level needed to reach a target market cap
    /// 
    /// Uses binary search to find the supply that gets closest to target market cap
    /// 
    /// # Arguments
    /// * `base_price` - The base price for the first NFT
    /// * `growth_factor` - Growth factor in basis points
    /// * `target_market_cap` - Target market cap in lamports
    /// * `max_supply` - Maximum supply to search up to
    /// 
    /// # Returns
    /// * `Result<u32>` - Supply level that reaches target market cap
    pub fn calculate_supply_for_market_cap(
        base_price: u64,
        growth_factor: u16,
        target_market_cap: u64,
        max_supply: u32,
    ) -> Result<u32> {
        if target_market_cap == 0 {
            return Ok(0);
        }

        let mut low = 0u32;
        let mut high = max_supply;
        let mut result = 0u32;

        while low <= high {
            let mid = low + (high - low) / 2;
            let market_cap = Self::calculate_market_cap(base_price, growth_factor, mid)?;

            if market_cap <= target_market_cap {
                result = mid;
                low = mid + 1;
            } else {
                if mid == 0 {
                    break;
                }
                high = mid - 1;
            }
        }

        Ok(result)
    }

    /// Calculate the burn price for an NFT (typically 99% of mint price)
    /// 
    /// # Arguments
    /// * `mint_price` - The price the NFT was minted at
    /// * `burn_fee_percentage` - Fee percentage in basis points (e.g., 100 = 1%)
    /// 
    /// # Returns
    /// * `Result<u64>` - Burn price in lamports
    pub fn calculate_burn_price(
        mint_price: u64,
        burn_fee_percentage: u16,
    ) -> Result<u64> {
        require!(burn_fee_percentage <= 10000, ErrorCode::InvalidAmount);

        let fee_amount = (mint_price as u128)
            .checked_mul(burn_fee_percentage as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(ErrorCode::MathOverflow)?;

        mint_price
            .checked_sub(fee_amount)
            .ok_or(ErrorCode::MathUnderflow.into())
    }

    /// Calculate the growth rate between two price points
    /// 
    /// # Arguments
    /// * `price1` - First price
    /// * `price2` - Second price
    /// 
    /// # Returns
    /// * `Result<u16>` - Growth rate in basis points
    pub fn calculate_growth_rate(price1: u64, price2: u64) -> Result<u16> {
        require!(price1 > 0, ErrorCode::InvalidAmount);
        require!(price2 >= price1, ErrorCode::InvalidAmount);

        if price1 == price2 {
            return Ok(10000); // 100% (no growth)
        }

        let growth = ((price2 as f64 / price1 as f64) * 10000.0) as u16;
        Ok(growth)
    }

    /// Validate bonding curve parameters
    /// 
    /// # Arguments
    /// * `base_price` - Base price to validate
    /// * `growth_factor` - Growth factor to validate
    /// * `max_supply` - Maximum supply to validate
    /// 
    /// # Returns
    /// * `Result<()>` - Success or error
    pub fn validate_parameters(
        base_price: u64,
        growth_factor: u16,
        max_supply: u32,
    ) -> Result<()> {
        // Validate base price
        require!(base_price > 0, ErrorCode::InvalidAmount);
        require!(
            base_price >= 1_000_000, // Minimum 0.001 SOL
            ErrorCode::InvalidAmount
        );
        require!(
            base_price <= 1_000_000_000_000, // Maximum 1000 SOL
            ErrorCode::InvalidAmount
        );

        // Validate growth factor
        require!(growth_factor > 0, ErrorCode::InvalidAmount);
        require!(
            growth_factor >= 10000, // Minimum 100% (no decay)
            ErrorCode::InvalidAmount
        );
        require!(
            growth_factor <= 50000, // Maximum 500% growth
            ErrorCode::InvalidAmount
        );

        // Validate max supply
        require!(max_supply > 0, ErrorCode::InvalidAmount);
        require!(
            max_supply <= 100000, // Maximum 100k NFTs
            ErrorCode::InvalidAmount
        );

        // Validate that the curve doesn't overflow at max supply
        let max_price = Self::calculate_price(base_price, growth_factor, max_supply - 1)?;
        require!(
            max_price <= 1_000_000_000_000_000, // Maximum 1M SOL per NFT
            ErrorCode::MathOverflow
        );

        Ok(())
    }
}

/// Bonding curve analysis results
#[derive(Debug, Clone)]
pub struct CurveAnalysis {
    pub current_price: u64,
    pub next_price: u64,
    pub price_increase: u64,
    pub price_increase_percentage: u64,
    pub market_cap: u64,
    pub average_price: u64,
}

impl BondingCurve {
    /// Perform comprehensive analysis of the bonding curve at current supply
    /// 
    /// # Arguments
    /// * `base_price` - Base price
    /// * `growth_factor` - Growth factor
    /// * `current_supply` - Current supply level
    /// 
    /// # Returns
    /// * `Result<CurveAnalysis>` - Comprehensive analysis
    pub fn analyze_curve(
        base_price: u64,
        growth_factor: u16,
        current_supply: u32,
    ) -> Result<CurveAnalysis> {
        let current_price = Self::calculate_price(base_price, growth_factor, current_supply)?;
        let next_price = Self::calculate_price(base_price, growth_factor, current_supply + 1)?;
        let price_increase = next_price.saturating_sub(current_price);
        
        let price_increase_percentage = if current_price > 0 {
            price_increase
                .checked_mul(10000)
                .and_then(|x| x.checked_div(current_price))
                .unwrap_or(0)
        } else {
            0
        };

        let market_cap = Self::calculate_market_cap(base_price, growth_factor, current_supply)?;
        
        let average_price = if current_supply > 0 {
            market_cap / current_supply as u64
        } else {
            0
        };

        Ok(CurveAnalysis {
            current_price,
            next_price,
            price_increase,
            price_increase_percentage,
            market_cap,
            average_price,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_price() {
        let base_price = 100_000_000; // 0.1 SOL
        let growth_factor = 1100; // 10% growth
        
        // First NFT should be base price
        assert_eq!(BondingCurve::calculate_price(base_price, growth_factor, 0).unwrap(), base_price);
        
        // Second NFT should be base_price * 1.1
        let second_price = BondingCurve::calculate_price(base_price, growth_factor, 1).unwrap();
        assert_eq!(second_price, 110_000_000); // 0.11 SOL
    }

    #[test]
    fn test_calculate_market_cap() {
        let base_price = 100_000_000; // 0.1 SOL
        let growth_factor = 1100; // 10% growth
        
        // Market cap for 0 supply should be 0
        assert_eq!(BondingCurve::calculate_market_cap(base_price, growth_factor, 0).unwrap(), 0);
        
        // Market cap for 1 NFT should be base price
        assert_eq!(BondingCurve::calculate_market_cap(base_price, growth_factor, 1).unwrap(), base_price);
        
        // Market cap for 2 NFTs should be base_price + base_price * 1.1
        let expected = base_price + 110_000_000;
        assert_eq!(BondingCurve::calculate_market_cap(base_price, growth_factor, 2).unwrap(), expected);
    }

    #[test]
    fn test_validate_parameters() {
        // Valid parameters
        assert!(BondingCurve::validate_parameters(100_000_000, 11000, 1000).is_ok());
        
        // Invalid base price (too low)
        assert!(BondingCurve::validate_parameters(100, 11000, 1000).is_err());
        
        // Invalid growth factor (too low)
        assert!(BondingCurve::validate_parameters(100_000_000, 5000, 1000).is_err());
        
        // Invalid max supply (zero)
        assert!(BondingCurve::validate_parameters(100_000_000, 11000, 0).is_err());
    }

    #[test]
    fn test_calculate_burn_price() {
        let mint_price = 1_000_000_000; // 1 SOL
        let burn_fee = 100; // 1%
        
        let burn_price = BondingCurve::calculate_burn_price(mint_price, burn_fee).unwrap();
        assert_eq!(burn_price, 990_000_000); // 0.99 SOL
    }

    #[test]
    fn test_curve_analysis() {
        let base_price = 100_000_000; // 0.1 SOL
        let growth_factor = 11000; // 10% growth
        let supply = 5;
        
        let analysis = BondingCurve::analyze_curve(base_price, growth_factor, supply).unwrap();
        
        assert!(analysis.current_price > 0);
        assert!(analysis.next_price > analysis.current_price);
        assert!(analysis.market_cap > 0);
        assert!(analysis.average_price > 0);
    }
}

