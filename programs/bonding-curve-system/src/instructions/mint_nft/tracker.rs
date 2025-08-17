use anchor_lang::prelude::*;

pub fn initialize_minter_tracker(ctx: &mut Context<super::MintNft>) -> Result<()> {
    let clock = Clock::get()?;
    
    let minter_tracker = &mut ctx.accounts.minter_tracker;
    minter_tracker.nft_mint = ctx.accounts.nft_mint.key();
    minter_tracker.original_minter = ctx.accounts.minter.key();
    minter_tracker.minted_at = clock.unix_timestamp;
    minter_tracker.collection = ctx.accounts.collection_mint.key();
    minter_tracker.bump = ctx.bumps.minter_tracker;
    
    Ok(())
}
