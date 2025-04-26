use anchor_lang::prelude::*;
use crate::constants::*;

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
        
        // Validate inputs to prevent overflow
        if self.base_price > u64::MAX / 1_000_000 {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        // Calculate e^(growth_factor * current_market_cap)
        // Using Taylor series approximation for efficiency
        let exponent = self.calculate_exponent(current_market_cap)?;
        
        // Calculate final price: base_price * e^(growth_factor * current_market_cap)
        self.base_price
            .checked_mul(exponent)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(1_000_000) // Scaling factor for fixed-point math
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate total cost to buy a specific amount of tokens
    pub fn calculate_buy_cost(&self, current_market_cap: u64, amount: u64) -> Result<u64> {
        // Validate inputs
        if amount == 0 {
            return Err(error!(crate::errors::ErrorCode::InvalidAmount));
        }
        
        let current_price = self.calculate_price(current_market_cap)?;
        
        // Check for potential overflow before adding
        if current_market_cap > u64::MAX - amount {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        let new_market_cap = current_market_cap
            .checked_add(amount)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            
        let new_price = self.calculate_price(new_market_cap)?;
        
        // Average price during the purchase
        let avg_price = current_price
            .checked_add(new_price)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(2)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Check for potential overflow before multiplying
        if avg_price > u64::MAX / amount {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        // Total cost = average price * amount
        avg_price
            .checked_mul(amount)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate amount received when selling tokens
    pub fn calculate_sell_amount(&self, current_market_cap: u64, amount: u64) -> Result<u64> {
        // Validate inputs
        if amount == 0 {
            return Err(error!(crate::errors::ErrorCode::InvalidAmount));
        }
        
        if amount > current_market_cap {
            return Err(error!(crate::errors::ErrorCode::InsufficientFunds));
        }
        
        let current_price = self.calculate_price(current_market_cap)?;
        
        let new_market_cap = current_market_cap
            .checked_sub(amount)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            
        let new_price = self.calculate_price(new_market_cap)?;
        
        // Average price during the sale
        let avg_price = current_price
            .checked_add(new_price)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(2)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Check for potential overflow before multiplying
        if avg_price > u64::MAX / amount {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        // Total amount = average price * amount
        avg_price
            .checked_mul(amount)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate mint fee (1% of total cost)
    pub fn calculate_mint_fee(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / MINT_FEE_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(MINT_FEE_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(100)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate creator royalty (5% of total cost)
    pub fn calculate_creator_royalty(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / CREATOR_ROYALTY_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(CREATOR_ROYALTY_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(100)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate secondary sale burn amount (1.5% of total cost)
    pub fn calculate_secondary_burn(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / SECONDARY_BURN_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(SECONDARY_BURN_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(1000) // Divide by 1000 since percentage is scaled by 10
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate secondary sale distribution amount (1.5% of total cost)
    pub fn calculate_secondary_distribute(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / SECONDARY_DISTRIBUTE_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(SECONDARY_DISTRIBUTE_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(1000) // Divide by 1000 since percentage is scaled by 10
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate buyback burn amount (2.5% of total cost)
    pub fn calculate_buyback_burn(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / BUYBACK_BURN_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(BUYBACK_BURN_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(1000) // Divide by 1000 since percentage is scaled by 10
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate buyback distribution amount (2.5% of total cost)
    pub fn calculate_buyback_distribute(&self, total_cost: u64) -> Result<u64> {
        // Check for potential overflow before multiplying
        if total_cost > u64::MAX / BUYBACK_DISTRIBUTE_PERCENTAGE {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        total_cost
            .checked_mul(BUYBACK_DISTRIBUTE_PERCENTAGE)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(1000) // Divide by 1000 since percentage is scaled by 10
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Calculate net cost after fees (for backward compatibility)
    pub fn calculate_net_cost(&self, total_cost: u64) -> Result<u64> {
        let mint_fee = self.calculate_mint_fee(total_cost)?;
        
        total_cost
            .checked_sub(mint_fee)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))
    }
    
    // Check if market cap has crossed the $69k threshold
    pub fn is_past_threshold(&self, current_market_cap: u64) -> bool {
        current_market_cap >= THRESHOLD_MARKET_CAP
    }
    
    // Calculate exponent using Taylor series approximation
    // e^x ≈ 1 + x + x²/2! + x³/3! + x⁴/4! + ...
    fn calculate_exponent(&self, current_market_cap: u64) -> Result<u64> {
        // Scale down for fixed-point math (6 decimal places)
        let scaling_factor = 1_000_000;
        
        // Validate inputs to prevent overflow
        if self.growth_factor > u64::MAX / current_market_cap {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        // Calculate x = growth_factor * current_market_cap / scaling_factor
        let x = self.growth_factor
            .checked_mul(current_market_cap)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(scaling_factor)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Limit x to prevent excessive calculations and potential overflows
        if x > 100 * scaling_factor {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        // First term: 1 * scaling_factor
        let mut result = scaling_factor;
        
        // Second term: x * scaling_factor
        let term1 = x;
        
        // Check for potential overflow before adding
        if result > u64::MAX - term1 {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        result = result
            .checked_add(term1)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Check if x is small enough to avoid unnecessary calculations
        if x < 1 {
            return Ok(result);
        }
        
        // Third term: (x²/2!) * scaling_factor
        // Check for potential overflow before multiplying
        if x > u64::MAX / x {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        let term2 = x
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(2)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            
        // Check for potential overflow before adding
        if result > u64::MAX - term2 {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        result = result
            .checked_add(term2)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Check if x is small enough to avoid unnecessary calculations
        if x < 5 {
            return Ok(result);
        }
        
        // Fourth term: (x³/3!) * scaling_factor
        // Check for potential overflow before multiplying
        if x > u64::MAX / (x * x) {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        let term3 = x
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(6) // 3! = 6
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            
        // Check for potential overflow before adding
        if result > u64::MAX - term3 {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        result = result
            .checked_add(term3)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        // Check if x is small enough to avoid unnecessary calculations
        if x < 10 {
            return Ok(result);
        }
        
        // Fifth term: (x⁴/4!) * scaling_factor
        // Check for potential overflow before multiplying
        if x > u64::MAX / (x * x * x) {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        let term4 = x
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_mul(x)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
            .checked_div(24) // 4! = 24
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            
        // Check for potential overflow before adding
        if result > u64::MAX - term4 {
            return Err(error!(crate::errors::ErrorCode::MathOverflow));
        }
        
        result = result
            .checked_add(term4)
            .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
        
        Ok(result)
    }
}
