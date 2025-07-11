use anchor_lang::prelude::*;

use crate::{
    errors::ErrorCode,
    state::{Bid, BidListing, BidListingStatus, BidStatus},
};

#[event]
pub struct BidCancelled {
    pub bid_id: u64,
    pub nft_mint: Pubkey,
    pub bidder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(bid_id: u64)]
pub struct CancelBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    /// The NFT mint the bid was for
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing for this NFT
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump = bid_listing.bump,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// The bid account to be cancelled
    #[account(
        mut,
        seeds = [b"bid", nft_mint.key().as_ref(), bid_id.to_le_bytes().as_ref()],
        bump = bid.bump,
        constraint = bid.bidder == bidder.key() @ ErrorCode::UnauthorizedBidCancellation,
    )]
    pub bid: Account<'info, Bid>,

    /// Escrow account holding the bid amount
    /// CHECK: This account holds the SOL for the bid
    #[account(
        mut,
        seeds = [b"bid-escrow", bid.key().as_ref()],
        bump,
    )]
    pub bid_escrow: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn cancel_bid(
    ctx: Context<CancelBid>,
    bid_id: u64,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let bid = &mut ctx.accounts.bid;
    let bid_listing = &mut ctx.accounts.bid_listing;

    // Check if bid can be cancelled
    require!(
        bid.can_be_cancelled(current_timestamp),
        ErrorCode::CannotCancelBid
    );

    // Store bid amount for refund
    let refund_amount = bid.amount;

    // Update bid status
    bid.status = BidStatus::Cancelled;

    // Refund the bidder
    **ctx.accounts.bid_escrow.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.bidder.to_account_info().try_borrow_mut_lamports()? += refund_amount;

    // If this was the highest bid, update the bid listing
    if bid_listing.highest_bidder == Some(ctx.accounts.bidder.key()) && 
       bid_listing.highest_bid == bid.amount {
        
        // Reset to no highest bid (would need to find next highest in a real implementation)
        bid_listing.highest_bid = 0;
        bid_listing.highest_bidder = None;
        
        // Note: In a production system, you'd want to iterate through all bids
        // to find the next highest active bid, but that's complex for this basic implementation
    }

    // Emit event
    emit!(BidCancelled {
        bid_id,
        nft_mint: ctx.accounts.nft_mint.key(),
        bidder: ctx.accounts.bidder.key(),
        amount: refund_amount,
        timestamp: current_timestamp,
    });

    msg!("Bid cancelled successfully!");
    msg!("Bid ID: {}", bid_id);
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Bidder: {}", ctx.accounts.bidder.key());
    msg!("Refunded amount: {} lamports", refund_amount);

    Ok(())
}

