use anchor_lang::prelude::*;
use crate::{
    constants::MINT_FEE_PERCENTAGE,
    errors::ErrorCode,
    utils::{debug::*, transfers::transfer_lamports},
    debug_log,
};
use super::MintNft;

/// Process mint payment and fees
pub fn process_mint_payment(ctx: &Context<MintNft>, mint_price: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("payment_processing");
    
    // Calculate fees
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;

    debug_log!(
        debug_ctx, 
        LogLevel::Debug, 
        "Payment breakdown - Total: {}, Platform: {}, Escrow: {}", 
        mint_price, 
        platform_fee, 
        escrow_amount
    );

    // Transfer platform fee
    if platform_fee > 0 {
        transfer_lamports(
            &ctx.accounts.minter.to_account_info(),
            &ctx.accounts.bonding_curve_pool.to_account_info(),
            platform_fee,
        )?;
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Payment processing completed");
    Ok(())
}

/// Calculate platform fee from mint price
pub fn calculate_platform_fee(amount: u64) -> Result<u64> {
    amount
        .checked_mul(MINT_FEE_PERCENTAGE as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow.into())
}

