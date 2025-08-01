use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
};
use super::{MintNft, calculate_platform_fee};

/// Update bonding curve pool state after mint
pub fn update_pool_state(ctx: &mut Context<MintNft>, mint_price: u64) -> Result<()> {
    let pool = &mut ctx.accounts.bonding_curve_pool;
    
    // Update supply
    pool.state.increment_supply()?;
    
    // Update statistics
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;
    
    pool.stats.record_mint(mint_price, escrow_amount)?;

    msg!(
        "Pool updated - Supply: {}, Total Escrowed: {}", 
        pool.state.current_supply, 
        pool.stats.total_escrowed
    );
    Ok(())
}

