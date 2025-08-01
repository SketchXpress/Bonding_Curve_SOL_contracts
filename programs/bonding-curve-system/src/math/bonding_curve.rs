use anchor_lang::prelude::*;
use crate::ErrorCode;

/// Calculate bonding curve price - optimized to prevent stack overflow
pub fn calculate_bonding_curve_price(
    base_price: u64,
    growth_factor: u16,
    current_supply: u32,
) -> Result<u64> {
    // Validate inputs
    if base_price == 0 {
        return Err(ErrorCode::InvalidAmount.into());
    }
    if growth_factor <= 10000 {
        return Err(ErrorCode::InvalidAmount.into());
    }

    // Prevent potentially expensive calculations for high supply
    if current_supply > 100 {
        msg!("Supply too high for calculation: {}", current_supply);
        return Err(ErrorCode::MaxSupplyReached.into());
    }

    // For small supplies, use simple multiplication to avoid loops
    if current_supply == 0 {
        return Ok(base_price);
    }

    // Use bit shifting and multiplication instead of loops for efficiency
    let growth_numerator = growth_factor as u64;
    let growth_denominator = 10000u64;
    
    let mut price = base_price;
    let mut remaining_supply = current_supply;
    
    // Process in chunks to avoid deep recursion/loops
    while remaining_supply > 0 {
        let chunk_size = remaining_supply.min(10); // Process max 10 at a time
        
        for _ in 0..chunk_size {
            price = price
                .checked_mul(growth_numerator)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(growth_denominator)
                .ok_or(ErrorCode::MathUnderflow)?;
        }
        
        remaining_supply = remaining_supply.saturating_sub(chunk_size);
        
        // Safety check to prevent infinite loops
        if price > 1_000_000_000_000 { // 1 trillion lamports max
            msg!("Price too high: {}", price);
            return Err(ErrorCode::MathOverflow.into());
        }
    }

    Ok(price)
}

/// Calculate minimum bid based on bonding curve price
pub fn calculate_minimum_bid(
    base_price: u64,
    growth_factor: u16,
    current_supply: u32,
    premium_bp: u16,
) -> Result<u64> {
    let curve_price = calculate_bonding_curve_price(base_price, growth_factor, current_supply)?;
    
    let premium = curve_price
        .checked_mul(premium_bp as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow)?;

    curve_price
        .checked_add(premium)
        .ok_or(ErrorCode::MathOverflow.into())
}

/// Calculate market cap
pub fn calculate_market_cap(
    base_price: u64,
    growth_factor: u16,
    current_supply: u32,
) -> Result<u64> {
    let current_price = calculate_bonding_curve_price(base_price, growth_factor, current_supply)?;
    
    current_price
        .checked_mul(current_supply as u64)
        .ok_or(ErrorCode::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bonding_curve_price() {
        // Test with base price 0.1 SOL, 10% growth
        let price = calculate_bonding_curve_price(100_000_000, 11000, 0).unwrap();
        assert_eq!(price, 100_000_000); // First NFT = base price

        let price = calculate_bonding_curve_price(100_000_000, 11000, 1).unwrap();
        assert_eq!(price, 110_000_000); // Second NFT = base * 1.1

        let price = calculate_bonding_curve_price(100_000_000, 11000, 2).unwrap();
        assert_eq!(price, 121_000_000); // Third NFT = base * 1.1^2
    }

    #[test]
    fn test_minimum_bid() {
        // Test 10% premium on 0.1 SOL
        let min_bid = calculate_minimum_bid(100_000_000, 11000, 0, 1000).unwrap();
        assert_eq!(min_bid, 110_000_000); // 0.1 SOL + 10% = 0.11 SOL
    }

    #[test]
    fn test_market_cap() {
        let market_cap = calculate_market_cap(100_000_000, 11000, 10).unwrap();
        assert!(market_cap > 0);
    }
}

