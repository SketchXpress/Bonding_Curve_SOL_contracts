use anchor_lang::prelude::*;
use crate::{
    utils::debug::*,
    debug_log,
};
use super::MintNft;

/// Initialize minter tracker account
pub fn initialize_minter_tracker(ctx: &Context<MintNft>, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("minter_tracking");
    
    let tracker = &mut ctx.accounts.minter_tracker;
    tracker.nft_mint = ctx.accounts.nft_mint.key();
    tracker.original_minter = ctx.accounts.minter.key();
    tracker.mint_timestamp = Clock::get()?.unix_timestamp;
    tracker.bump = ctx.bumps.minter_tracker;

    debug_log!(debug_ctx, LogLevel::Debug, "Minter tracker initialized");
    Ok(())
}

