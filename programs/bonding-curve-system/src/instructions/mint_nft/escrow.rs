use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
};
use super::{MintNft, calculate_platform_fee};

/// Initialize NFT escrow account
pub fn initialize_nft_escrow(ctx: &mut Context<MintNft>, mint_price: u64) -> Result<()> {
    let platform_fee = calculate_platform_fee(mint_price)?;
    let escrow_amount = mint_price.checked_sub(platform_fee).ok_or(ErrorCode::MathUnderflow)?;

    let escrow = &mut ctx.accounts.nft_escrow;
    escrow.nft_mint = ctx.accounts.nft_mint.key();
    escrow.lamports = escrow_amount;
    escrow.last_price = mint_price;
    escrow.bump = ctx.bumps.nft_escrow;

    msg!("NFT escrow initialized with {} lamports", escrow_amount);
    Ok(())
}

