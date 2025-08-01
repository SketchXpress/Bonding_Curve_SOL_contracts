use anchor_lang::prelude::*;
use super::MintNft;

/// Initialize minter tracker account
pub fn initialize_minter_tracker(ctx: &mut Context<MintNft>) -> Result<()> {
    let tracker = &mut ctx.accounts.minter_tracker;
    tracker.nft_mint = ctx.accounts.nft_mint.key();
    tracker.original_minter = ctx.accounts.minter.key();
    tracker.minted_at = Clock::get()?.unix_timestamp;
    tracker.collection = ctx.accounts.bonding_curve_pool.collection;
    tracker.bump = ctx.bumps.minter_tracker;

    msg!("Minter tracker initialized");
    Ok(())
}

