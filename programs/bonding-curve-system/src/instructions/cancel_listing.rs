use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{BidListing, BidListingStatus};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub lister: Signer<'info>,

    /// The NFT mint that was listed
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing account to cancel
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump = bid_listing.bump,
        constraint = bid_listing.lister == lister.key() @ ErrorCode::UnauthorizedLister,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::InvalidListingStatus,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// Lister's token account (to verify they still own the NFT)
    #[account(
        associated_token::mint = nft_mint,
        associated_token::authority = lister,
        constraint = lister_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance,
    )]
    pub lister_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
    let bid_listing = &mut ctx.accounts.bid_listing;
    let current_time = Clock::get()?.unix_timestamp;

    // Ensure no active bids exist
    require!(
        bid_listing.highest_bid == 0 || bid_listing.highest_bidder.is_none(),
        ErrorCode::CannotCancelWithActiveBids
    );

    // Cancel the listing
    bid_listing.cancel(current_time)?;

    msg!(
        "Bid listing cancelled successfully. NFT: {}, Lister: {}",
        ctx.accounts.nft_mint.key(),
        ctx.accounts.lister.key()
    );

    Ok(())
}
