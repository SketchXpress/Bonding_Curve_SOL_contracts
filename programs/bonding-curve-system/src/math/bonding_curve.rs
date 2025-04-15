use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::constants::{PRECISION, GROWTH_FACTOR_PRECISION, DEFAULT_GROWTH_FACTOR, THRESHOLD_MARKET_CAP};

/// Calculate price based on the bonding curve formula
/// Uses an exponential function: price = base_price * e^(growth_factor * current_market_cap)
/// Implemented using Taylor series approximation for e^x
pub fn calculate_price(
    current_market_cap: u64,
    base_price: u64,
    growth_factor: u64,
) -> Result<u64> {
    // Use default growth factor if not provided
    let growth_factor = if growth_factor == 0 {
        DEFAULT_GROWTH_FACTOR
    } else {
        growth_factor
    };
    
    // Using a Taylor series approximation for exp(x)
    // exp(x) ≈ 1 + x + x²/2! + x³/3! + ...
    
    let x = (current_market_cap as u128)
        .checked_mul(growth_factor as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(GROWTH_FACTOR_PRECISION as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Calculate first 4 terms of the Taylor series
    // term0 = 1
    let term0 = PRECISION as u128;
    
    // term1 = x
    let term1 = x;
    
    // term2 = x²/2
    let term2 = x
        .checked_mul(x)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(2)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // term3 = x³/6
    let term3 = x
        .checked_mul(x)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(x)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(6)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Sum the terms
    let exp_result = term0
        .checked_add(term1)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_add(term2)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_add(term3)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Calculate final price: base_price * exp_result
    let price = (base_price as u128)
        .checked_mul(exp_result)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(PRECISION as u128)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Check if result fits in u64
    if price > u64::MAX as u128 {
        return Err(ErrorCode::MathOverflow.into());
    }
    
    Ok(price as u64)
}

/// Check if market cap has passed the special threshold
pub fn is_past_threshold(market_cap: u64) -> bool {
    market_cap >= THRESHOLD_MARKET_CAP
}

/// Calculate platform fee amount (percentage of total cost)
pub fn calculate_platform_fee(total_cost: u64, fee_percentage: u64) -> Result<u64> {
    total_cost
        .checked_mul(fee_percentage)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)
}

/// Calculate escrow amount (total cost minus platform fee)
pub fn calculate_escrow_amount(total_cost: u64, platform_fee: u64) -> Result<u64> {
    total_cost
        .checked_sub(platform_fee)
        .ok_or(ErrorCode::MathOverflow)
}
