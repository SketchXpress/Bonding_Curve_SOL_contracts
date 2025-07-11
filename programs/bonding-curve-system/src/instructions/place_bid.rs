use anchor_lang::prelude::*;

use crate::{
    errors::ErrorCode,
    state::{Bid, BidListing, BidListingStatus, BidStatus},
};

#[event]
pub struct BidPlaced {
    pub bid_id: u64,
    pub nft_mint: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub previous_highest_bid: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(bid_id: u64)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    /// The NFT mint being bid on
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing for this NFT
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump = bid_listing.bump,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::BidListingNotActive,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// The bid account to be created
    #[account(
        init,
        payer = bidder,
        seeds = [b"bid", nft_mint.key().as_ref(), bid_id.to_le_bytes().as_ref()],
        bump,
        space = Bid::SPACE,
    )]
    pub bid: Account<'info, Bid>,

    /// Escrow account to hold the bid amount
    /// CHECK: This account will hold the SOL for the bid
    #[account(
        mut,
        seeds = [b"bid-escrow", bid.key().as_ref()],
        bump,
    )]
    pub bid_escrow: UncheckedAccount<'info>,

    /// Previous highest bid account (if exists)
    #[account(
        mut,
        seeds = [b"bid", nft_mint.key().as_ref(), previous_bid_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub previous_bid: Option<Account<'info, Bid>>,

    /// Previous bid escrow (if exists)
    /// CHECK: Previous bid escrow account
    #[account(mut)]
    pub previous_bid_escrow: Option<UncheckedAccount<'info>>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlaceBidArgs {
    pub bid_id: u64,
    pub amount: u64,
    pub duration_hours: Option<u32>, // None = no expiry
    pub previous_bid_id: Option<u64>, // For outbidding
}

pub fn place_bid(
    ctx: Context<PlaceBid>,
    args: PlaceBidArgs,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let bid_listing = &mut ctx.accounts.bid_listing;

    // Check if listing is still active and not expired
    require!(
        bid_listing.is_active(),
        ErrorCode::BidListingNotActive
    );
    require!(
        !bid_listing.is_expired(current_timestamp),
        ErrorCode::BidListingExpired
    );

    // Validate bid amount
    require!(args.amount > 0, ErrorCode::InvalidBidAmount);
    require!(
        args.amount >= bid_listing.min_bid,
        ErrorCode::BidTooLow
    );

    // If there's a current highest bid, new bid must be higher
    if bid_listing.highest_bid > 0 {
        require!(
            args.amount > bid_listing.highest_bid,
            ErrorCode::BidTooLow
        );
    }

    // Prevent self-bidding (bidder can't bid on their own listing)
    require!(
        ctx.accounts.bidder.key() != bid_listing.lister,
        ErrorCode::CannotBidOnOwnListing
    );

    // Calculate expiry timestamp for bid
    let expires_at = if let Some(hours) = args.duration_hours {
        current_timestamp + (hours as i64 * 3600)
    } else {
        0 // No expiry
    };

    // Transfer SOL to bid escrow
    let transfer_to_escrow = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.bidder.key(),
        &ctx.accounts.bid_escrow.key(),
        args.amount,
    );
    anchor_lang::solana_program::program::invoke(
        &transfer_to_escrow,
        &[
            ctx.accounts.bidder.to_account_info(),
            ctx.accounts.bid_escrow.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Handle previous highest bid (mark as outbid and refund)
    let previous_highest_bid = bid_listing.highest_bid;
    if let Some(previous_bid) = &mut ctx.accounts.previous_bid {
        if previous_bid.status == BidStatus::Active {
            previous_bid.status = BidStatus::Outbid;
            
            // Refund previous bidder
            if let Some(previous_escrow) = &ctx.accounts.previous_bid_escrow {
                let refund_amount = previous_bid.amount;
                **previous_escrow.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
                **ctx.accounts.bidder.to_account_info().try_borrow_mut_lamports()? += refund_amount;
            }
        }
    }

    // Initialize new bid
    let bid = &mut ctx.accounts.bid;
    bid.bid_id = args.bid_id;
    bid.nft_mint = ctx.accounts.nft_mint.key();
    bid.bidder = ctx.accounts.bidder.key();
    bid.amount = args.amount;
    bid.status = BidStatus::Active;
    bid.created_at = current_timestamp;
    bid.expires_at = expires_at;
    bid.escrow_account = ctx.accounts.bid_escrow.key();
    bid.bump = ctx.bumps.bid;

    // Update bid listing with new highest bid
    bid_listing.highest_bid = args.amount;
    bid_listing.highest_bidder = Some(ctx.accounts.bidder.key());

    // Emit event
    emit!(BidPlaced {
        bid_id: args.bid_id,
        nft_mint: ctx.accounts.nft_mint.key(),
        bidder: ctx.accounts.bidder.key(),
        amount: args.amount,
        previous_highest_bid,
        timestamp: current_timestamp,
    });

    msg!("Bid placed successfully!");
    msg!("Bid ID: {}", args.bid_id);
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Bidder: {}", ctx.accounts.bidder.key());
    msg!("Amount: {} lamports", args.amount);
    msg!("Previous highest bid: {} lamports", previous_highest_bid);

    Ok(())
}

