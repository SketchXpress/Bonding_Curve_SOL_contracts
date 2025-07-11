use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::{BidListing, Bid, BondingCurvePool, BidListingStatus, BidStatus};
use crate::utils::{PdaHelper, DynamicPricing, AccountValidator, BusinessValidator};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(args: PlaceBidArgs)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    /// The NFT mint being bid on
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bonding curve pool for dynamic pricing
    #[account(
        seeds = [b"pool", collection_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,

    /// Collection mint for the NFT
    pub collection_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing for this NFT
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::BidListingNotActive,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// The bid account to be created
    #[account(
        init,
        payer = bidder,
        space = Bid::LEN,
        seeds = [
            b"bid",
            nft_mint.key().as_ref(),
            &args.bid_id.to_le_bytes(),
        ],
        bump,
    )]
    pub bid: Account<'info, Bid>,

    /// Escrow account for the bid amount
    #[account(
        init,
        payer = bidder,
        space = 0,
        seeds = [b"bid-escrow", bid.key().as_ref()],
        bump,
    )]
    pub bid_escrow: SystemAccount<'info>,

    /// Bidder's token account (to verify they don't own the NFT)
    #[account(
        associated_token::mint = nft_mint,
        associated_token::authority = bidder,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlaceBidArgs {
    pub bid_id: u64,
    pub amount: u64,
    pub duration_hours: Option<u32>,
}

pub fn place_bid(ctx: Context<PlaceBid>, args: PlaceBidArgs) -> Result<()> {
    let bidder = &ctx.accounts.bidder;
    let nft_mint = &ctx.accounts.nft_mint;
    let pool = &ctx.accounts.pool;
    let bid_listing = &mut ctx.accounts.bid_listing;
    let bid = &mut ctx.accounts.bid;
    let bid_escrow = &ctx.accounts.bid_escrow;
    let bidder_token_account = &ctx.accounts.bidder_token_account;

    let current_time = Clock::get()?.unix_timestamp;

    // Validate listing is not expired
    AccountValidator::validate_not_expired(bid_listing.expires_at, current_time)?;

    // Validate bidder doesn't own the NFT
    require!(
        bidder_token_account.amount == 0,
        ErrorCode::CannotBidOnOwnNft
    );

    // Validate bidder has sufficient funds
    AccountValidator::validate_sol_balance(&bidder.to_account_info(), args.amount)?;

    // DYNAMIC PRICING VALIDATION - KEY FEATURE
    // Bids must always exceed current bonding curve price + premium
    DynamicPricing::validate_dynamic_bid_amount(
        args.amount,
        pool,
        bid_listing.highest_bid,
        10, // 10% minimum premium above bonding curve
        5,  // 5% increment above current highest bid
    )?;

    // Validate bid duration
    let bid_duration = BusinessValidator::validate_duration(args.duration_hours)?;
    let bid_expires_at = if bid_duration > 0 {
        current_time + bid_duration
    } else {
        0 // No expiry
    };

    // Initialize bid account
    bid.bid_id = args.bid_id;
    bid.nft_mint = nft_mint.key();
    bid.bidder = bidder.key();
    bid.amount = args.amount;
    bid.status = BidStatus::Active;
    bid.created_at = current_time;
    bid.expires_at = bid_expires_at;
    bid.bump = ctx.bumps.bid;

    // Transfer SOL to escrow
    let transfer_instruction = anchor_lang::system_program::Transfer {
        from: bidder.to_account_info(),
        to: bid_escrow.to_account_info(),
    };

    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
        ),
        args.amount,
    )?;

    // Update bid listing with new highest bid if applicable
    if args.amount > bid_listing.highest_bid {
        bid_listing.highest_bid = args.amount;
        bid_listing.highest_bidder = Some(bidder.key());
        bid_listing.total_bids += 1;
        
        // Update minimum bid based on current bonding curve price
        DynamicPricing::update_listing_minimum_bid(
            bid_listing,
            pool,
            10, // 10% premium
        )?;
    }

    // Get bonding curve price for logging
    let bonding_curve_price = DynamicPricing::get_current_bonding_curve_price(pool)?;
    let premium_percentage = if bonding_curve_price > 0 {
        ((args.amount.saturating_sub(bonding_curve_price)) * 100) / bonding_curve_price
    } else {
        0
    };

    // Emit event for frontend tracking
    emit!(BidPlacedEvent {
        bid_id: args.bid_id,
        nft_mint: nft_mint.key(),
        bidder: bidder.key(),
        amount: args.amount,
        bonding_curve_price,
        premium_percentage,
        expires_at: bid_expires_at,
        timestamp: current_time,
    });

    msg!(
        "Dynamic bid placed: {} SOL on NFT {} (Bonding curve: {} SOL, Premium: {}%)",
        args.amount as f64 / 1_000_000_000.0,
        nft_mint.key(),
        bonding_curve_price as f64 / 1_000_000_000.0,
        premium_percentage
    );

    Ok(())
}

#[event]
pub struct BidPlacedEvent {
    pub bid_id: u64,
    pub nft_mint: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub bonding_curve_price: u64,
    pub premium_percentage: u64,
    pub expires_at: i64,
    pub timestamp: i64,
}

