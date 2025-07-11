use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{
    errors::ErrorCode,
    state::{BidListing, BidListingStatus, MinterTracker},
};

#[event]
pub struct NftListedForBids {
    pub nft_mint: Pubkey,
    pub lister: Pubkey,
    pub original_minter: Pubkey,
    pub min_bid: u64,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct ListForBids<'info> {
    #[account(mut)]
    pub lister: Signer<'info>,

    /// The NFT mint being listed
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The lister's token account holding the NFT
    #[account(
        constraint = nft_token_account.mint == nft_mint.key(),
        constraint = nft_token_account.owner == lister.key(),
        constraint = nft_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance
    )]
    pub nft_token_account: Account<'info, TokenAccount>,

    /// Minter tracker to get original minter info
    #[account(
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump = minter_tracker.bump,
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// Bid listing account to be created
    #[account(
        init,
        payer = lister,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump,
        space = BidListing::SPACE,
    )]
    pub bid_listing: Account<'info, BidListing>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn list_for_bids(
    ctx: Context<ListForBids>,
    min_bid: u64,
    duration_hours: Option<u32>, // None = no expiry
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    
    // Calculate expiry timestamp
    let expires_at = if let Some(hours) = duration_hours {
        current_timestamp + (hours as i64 * 3600) // Convert hours to seconds
    } else {
        0 // No expiry
    };

    // Validate minimum bid
    require!(min_bid > 0, ErrorCode::InvalidBidAmount);

    // Initialize bid listing
    let bid_listing = &mut ctx.accounts.bid_listing;
    bid_listing.nft_mint = ctx.accounts.nft_mint.key();
    bid_listing.lister = ctx.accounts.lister.key();
    bid_listing.original_minter = ctx.accounts.minter_tracker.original_minter;
    bid_listing.min_bid = min_bid;
    bid_listing.highest_bid = 0;
    bid_listing.highest_bidder = None;
    bid_listing.status = BidListingStatus::Active;
    bid_listing.created_at = current_timestamp;
    bid_listing.expires_at = expires_at;
    bid_listing.bump = ctx.bumps.bid_listing;

    // Emit event
    emit!(NftListedForBids {
        nft_mint: ctx.accounts.nft_mint.key(),
        lister: ctx.accounts.lister.key(),
        original_minter: ctx.accounts.minter_tracker.original_minter,
        min_bid,
        expires_at,
        timestamp: current_timestamp,
    });

    msg!("NFT listed for bids successfully!");
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Lister: {}", ctx.accounts.lister.key());
    msg!("Original Minter: {}", ctx.accounts.minter_tracker.original_minter);
    msg!("Minimum Bid: {} lamports", min_bid);
    
    if expires_at > 0 {
        msg!("Expires at: {}", expires_at);
    } else {
        msg!("No expiry set");
    }

    Ok(())
}

