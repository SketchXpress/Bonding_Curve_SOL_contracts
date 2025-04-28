pub mod price_calculation {
    use anchor_lang::prelude::*;
    use crate::errors::ErrorCode;

    // Calculate price for minting an NFT
    // price = base_price * growth_factor^current_supply
    pub fn calculate_mint_price(
        base_price: u64,
        growth_factor: u64,
        current_supply: u64,
    ) -> Result<u64> {
        // Fixed-point arithmetic with 6 decimal places
        // growth_factor of 1.2 is represented as 1_200_000
        const FIXED_POINT_SCALE: u64 = 1_000_000;
        
        // For the first NFT (supply = 0), price is just the base price
        if current_supply == 0 {
            return Ok(base_price);
        }
        
        // For subsequent NFTs, apply the growth factor
        // We use a simple multiplication approach for fixed-point math
        let mut price = base_price;
        
        for _ in 0..current_supply {
            price = price
                .checked_mul(growth_factor)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(FIXED_POINT_SCALE)
                .ok_or(ErrorCode::MathOverflow)?;
        }
        
        Ok(price)
    }
    
    // Calculate price for selling an NFT
    // price = base_price * growth_factor^(current_supply-1)
    pub fn calculate_sell_price(
        base_price: u64,
        growth_factor: u64,
        current_supply: u64,
    ) -> Result<u64> {
        // We need at least one NFT in supply to sell
        if current_supply == 0 {
            return Err(ErrorCode::InsufficientEscrowBalance.into());
        }
        
        // Selling price is based on the supply after this NFT is burned
        // So we calculate for (current_supply - 1)
        calculate_mint_price(base_price, growth_factor, current_supply - 1)
    }
}
