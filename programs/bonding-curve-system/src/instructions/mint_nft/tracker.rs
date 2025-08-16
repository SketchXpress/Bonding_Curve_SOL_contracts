use anchor_lang::prelude::*;
use super::MintNft;

pub fn initialize_minter_tracker(ctx: &mut Context<MintNft>) -> Result<()> {
    let tracker = &mut ctx.accounts.minter_tracker;
    tracker.nft_mint = ctx.accounts.nft_mint.key();
    tracker.original_minter = ctx.accounts.minter.key();
    tracker.minted_at = Clock::get()?.unix_timestamp;
    tracker.collection = ctx.accounts.collection_mint.key();
    msg!("Minter tracker initialized");
    Ok(())
}
