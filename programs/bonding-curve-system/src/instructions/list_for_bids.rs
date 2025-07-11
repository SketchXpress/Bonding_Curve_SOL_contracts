use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{BidListing, BondingCurvePool, BidListingStatus};
use crate::utils::{DynamicPricing, AccountValidator, BusinessValidator};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(args: ListForBidsArgs)]
pub struct ListForBids<'info> {
    #[account(mut)]
    pub lister: Signer<'info>,

    /// The NFT mint to list for bids
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bonding curve pool for dynamic pricing
    #[account(
        seeds = [b"pool", collection_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,

    /// Collection mint for the NFT
    pub collection_mint: Account<'info, anchor_spl::token::Mint>,

    /// Lister's token account (must own the NFT)
    #[account(
        associated_token::mint = nft_mint,
        associated_token::authority = lister,
        constraint = lister_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance,
    )]
    pub lister_token_account: Account<'info, TokenAccount>,

    /// The bid listing account to be created
    #[account(
        init,
        payer = lister,
        space = BidListing::LEN,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump,
    )]
    pub bid_listing: Account<'info, BidListing>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ListForBidsArgs {
    pub min_bid: u64,
    pub duration_hours: Option<u32>,
}

pub fn list_for_bids(ctx: Context<ListForBids>, args: ListForBidsArgs) -> Result<()> {
    let lister = &ctx.accounts.lister;
    let nft_mint = &ctx.accounts.nft_mint;
    let pool = &ctx.accounts.pool;
    let bid_listing = &mut ctx.accounts.bid_listing;

    let current_time = Clock::get()?.unix_timestamp;

    // Get current bonding curve price
    let bonding_curve_price = DynamicPricing::get_current_bonding_curve_price(pool)?;
    
    // Calculate dynamic minimum bid (must be above bonding curve price)
    let dynamic_minimum = DynamicPricing::calculate_minimum_bid_required(pool, 10)?; // 10% premium

    // Use the higher of user's minimum or dynamic minimum
    let effective_min_bid = std::cmp::max(args.min_bid, dynamic_minimum);

    // Validate that the minimum bid is reasonable
    require!(
        effective_min_bid >= bonding_curve_price,
        ErrorCode::BidMustExceedBondingCurve
    );

    // Validate duration
    let listing_duration = BusinessValidator::validate_duration(args.duration_hours)?;
    let expires_at = if listing_duration > 0 {
        current_time + listing_duration
    } else {
        0 // No expiry
    };

    // Initialize bid listing
    bid_listing.nft_mint = nft_mint.key();
    bid_listing.lister = lister.key();
    bid_listing.min_bid = effective_min_bid;
    bid_listing.highest_bid = 0;
    bid_listing.highest_bidder = None;
    bid_listing.total_bids = 0;
    bid_listing.status = BidListingStatus::Active;
    bid_listing.created_at = current_time;
    bid_listing.expires_at = expires_at;
    bid_listing.last_price_update = current_time;
    bid_listing.bonding_curve_price_at_listing = bonding_curve_price;
    bid_listing.bump = ctx.bumps.bid_listing;

    // Calculate premium percentage for logging
    let premium_percentage = if bonding_curve_price > 0 {
        ((effective_min_bid.saturating_sub(bonding_curve_price)) * 100) / bonding_curve_price
    } else {
        0
    };

    // Emit event for frontend tracking
    emit!(ListingCreatedEvent {
        nft_mint: nft_mint.key(),
        lister: lister.key(),
        min_bid: effective_min_bid,
        bonding_curve_price,
        premium_percentage,
        expires_at,
        timestamp: current_time,
    });

    msg!(
        "Dynamic listing created: {} with minimum {} SOL (Bonding curve: {} SOL, Premium: {}%)",
        nft_mint.key(),
        effective_min_bid as f64 / 1_000_000_000.0,
        bonding_curve_price as f64 / 1_000_000_000.0,
        premium_percentage
    );

    Ok(())
}

#[event]
pub struct ListingCreatedEvent {
    pub nft_mint: Pubkey,
    pub lister: Pubkey,
    pub min_bid: u64,
    pub bonding_curve_price: u64,
    pub premium_percentage: u64,
    pub expires_at: i64,
    pub timestamp: i64,
}

