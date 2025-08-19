use anchor_lang::prelude::*;
use crate::state::Pool;
use crate::math::*;

pub struct PricingEngine;

impl PricingEngine {
    pub fn calculate_mint_price(pool: &Pool, current_supply: u64) -> Result<u64> {
        let base_price = pool.base_price;
        let growth_factor = pool.growth_factor;
        
        calculate_exponential_price(base_price, growth_factor, current_supply)
    }

    pub fn calculate_minimum_bid(current_price: u64, premium_percentage: u8) -> Result<u64> {
        let premium = (current_price as u128)
            .checked_mul(premium_percentage as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?;
            
        Ok(current_price.checked_add(premium as u64).ok_or(ErrorCode::MathOverflow)?)
    }

    pub fn calculate_escrow_amount(price: u64) -> Result<u64> {
        Ok(price.checked_div(2).ok_or(ErrorCode::MathOverflow)?)
    }
}
