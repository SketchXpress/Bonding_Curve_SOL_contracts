use anchor_lang::prelude::*;
use crate::errors::ErrorCode;

// Exponential bonding curve implementation
pub struct BondingCurve {
    pub base_price: u64,
    pub growth_factor: u64,
}

impl BondingCurve {
    // Calculate price based on current market cap
    pub fn calculate_price(&self, current_market_cap: u64) -> Result<u64> {
        // Base price for empty market
        if current_market_cap == 0 {
            return Ok(self.base_price);
        }
        
        // Calculate e^(growth_factor * current_market_cap)
        // Using Taylor series approximation for efficiency
        let exponent = self.calculate_exponent(current_market_cap)?;
        
        // Calculate final price: base_price * e^(growth_factor * current_market_cap)
        self.base_price
            .checked_mul(exponent)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(1_000_000) // Scaling factor for fixed-point math
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())
    }
    
    // Calculate total cost to buy a specific amount of tokens
    pub fn calculate_buy_cost(&self, current_market_cap: u64, amount: u64) -> Result<u64> {
        let current_price = self.calculate_price(current_market_cap)?;
        let new_market_cap = current_market_cap
            .checked_add(amount)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        let new_price = self.calculate_price(new_market_cap)?;
        
        // Average price during the purchase
        let avg_price = current_price
            .checked_add(new_price)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(2)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // Total cost = average price * amount
        avg_price
            .checked_mul(amount)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())
    }
    
    // Calculate amount received when selling tokens
    pub fn calculate_sell_amount(&self, current_market_cap: u64, amount: u64) -> Result<u64> {
        let current_price = self.calculate_price(current_market_cap)?;
        let new_market_cap = current_market_cap
            .checked_sub(amount)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        let new_price = self.calculate_price(new_market_cap)?;
        
        // Average price during the sale
        let avg_price = current_price
            .checked_add(new_price)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(2)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // Total amount = average price * amount
        avg_price
            .checked_mul(amount)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())
    }
    
    // Calculate platform fee (5% of total cost)
    pub fn calculate_platform_fee(&self, total_cost: u64) -> Result<u64> {
        let fee_percentage = 5; // 5%
        
        total_cost
            .checked_mul(fee_percentage)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(100)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())
    }
    
    // Calculate net cost after platform fee
    pub fn calculate_net_cost(&self, total_cost: u64) -> Result<u64> {
        let platform_fee = self.calculate_platform_fee(total_cost)?;
        
        total_cost
            .checked_sub(platform_fee)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())
    }
    
    // Check if market cap has crossed the $69k threshold
    pub fn is_past_threshold(&self, current_market_cap: u64) -> bool {
        // $69k in lamports
        const THRESHOLD: u64 = 69_000_000_000;
        
        current_market_cap >= THRESHOLD
    }
    
    // Calculate exponent using Taylor series approximation
    // e^x ≈ 1 + x + x²/2! + x³/3! + x⁴/4! + ...
    fn calculate_exponent(&self, current_market_cap: u64) -> Result<u64> {
        // Scale down for fixed-point math (6 decimal places)
        let scaling_factor = 1_000_000;
        
        // Calculate x = growth_factor * current_market_cap / scaling_factor
        let x = self.growth_factor
            .checked_mul(current_market_cap)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(scaling_factor)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // First term: 1 * scaling_factor
        let mut result = scaling_factor;
        
        // Second term: x * scaling_factor
        let term1 = x;
        result = result
            .checked_add(term1)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // Third term: (x²/2!) * scaling_factor
        let term2 = x
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(2)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        result = result
            .checked_add(term2)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // Fourth term: (x³/3!) * scaling_factor
        let term3 = x
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(6) // 3! = 6
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        result = result
            .checked_add(term3)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        // Fifth term: (x⁴/4!) * scaling_factor
        let term4 = x
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_mul(x)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?
            .checked_div(24) // 4! = 24
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        result = result
            .checked_add(term4)
            .ok_or::<anchor_lang::error::Error>(ErrorCode::MathOverflow.into())?;
        
        Ok(result)
    }
}
