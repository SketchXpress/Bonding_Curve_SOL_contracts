use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

use crate::{
    constants::{MINTER_REVENUE_PERCENTAGE, PLATFORM_REVENUE_PERCENTAGE, COLLECTION_REVENUE_PERCENTAGE},
    errors::ErrorCode,
    state::{Bid, BidListing, BidListingStatus, BidStatus, MinterTracker, CollectionDistribution},
};

#[event]
pub struct BidAccepted {
    pub bid_id: u64,
    pub nft_mint: Pubkey,
    pub bidder: Pubkey,
    pub original_minter: Pubkey,
    pub lister: Pubkey,
    pub amount: u64,
    pub minter_share: u64,
    pub platform_share: u64,
    pub collection_share: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction(bid_id: u64)]
pub struct AcceptBid<'info> {
    /// The original minter who accepts the bid (must be the original minter)
    #[account(mut)]
    pub minter: Signer<'info>,

    /// The NFT mint being sold
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing for this NFT
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump = bid_listing.bump,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::BidListingNotActive,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// The winning bid account
    #[account(
        mut,
        seeds = [b"bid", nft_mint.key().as_ref(), bid_id.to_le_bytes().as_ref()],
        bump = bid.bump,
        constraint = bid.status == BidStatus::Active @ ErrorCode::CannotAcceptBid,
        constraint = bid.amount == bid_listing.highest_bid @ ErrorCode::BidNotFound,
    )]
    pub bid: Account<'info, Bid>,

    /// Minter tracker to verify original minter
    #[account(
        mut,
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump = minter_tracker.bump,
        constraint = minter_tracker.original_minter == minter.key() @ ErrorCode::UnauthorizedBidAcceptance,
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// Collection distribution account
    #[account(
        mut,
        seeds = [b"collection-distribution", minter_tracker.collection.as_ref()],
        bump = collection_distribution.bump,
    )]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    /// Escrow account holding the bid amount
    /// CHECK: This account holds the SOL for the bid
    #[account(
        mut,
        seeds = [b"bid-escrow", bid.key().as_ref()],
        bump,
    )]
    pub bid_escrow: UncheckedAccount<'info>,

    /// Current NFT owner's token account (the lister)
    #[account(
        mut,
        constraint = lister_token_account.mint == nft_mint.key(),
        constraint = lister_token_account.owner == bid_listing.lister,
        constraint = lister_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance
    )]
    pub lister_token_account: Account<'info, TokenAccount>,

    /// Bidder's token account (will receive the NFT)
    #[account(
        mut,
        constraint = bidder_token_account.mint == nft_mint.key(),
        constraint = bidder_token_account.owner == bid.bidder,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,

    /// Platform fee recipient
    /// CHECK: Platform wallet for receiving fees
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// The lister (current NFT owner) - needed for authorization
    /// CHECK: Current owner of the NFT who listed it
    #[account(
        mut,
        constraint = lister.key() == bid_listing.lister @ ErrorCode::InvalidAuthority
    )]
    pub lister: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn accept_bid(
    ctx: Context<AcceptBid>,
    bid_id: u64,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let bid = &mut ctx.accounts.bid;
    let bid_listing = &mut ctx.accounts.bid_listing;
    let minter_tracker = &mut ctx.accounts.minter_tracker;
    let collection_distribution = &mut ctx.accounts.collection_distribution;

    // Verify bid can be accepted
    require!(
        bid.can_be_accepted(current_timestamp),
        ErrorCode::CannotAcceptBid
    );

    // Verify this is the highest bid
    require!(
        bid_listing.highest_bidder == Some(bid.bidder),
        ErrorCode::BidNotFound
    );

    let total_amount = bid.amount;

    // Calculate revenue distribution
    let minter_share = total_amount
        .checked_mul(MINTER_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    let platform_share = total_amount
        .checked_mul(PLATFORM_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    let collection_share = total_amount
        .checked_mul(COLLECTION_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    // Verify amounts add up correctly
    let total_distributed = minter_share
        .checked_add(platform_share)
        .and_then(|x| x.checked_add(collection_share))
        .ok_or(ErrorCode::MathOverflow)?;

    require!(
        total_distributed <= total_amount,
        ErrorCode::RevenueDistributionFailed
    );

    // Transfer SOL from bid escrow to recipients
    
    // 95% to original minter
    **ctx.accounts.bid_escrow.to_account_info().try_borrow_mut_lamports()? -= minter_share;
    **ctx.accounts.minter.to_account_info().try_borrow_mut_lamports()? += minter_share;

    // 4% to platform
    **ctx.accounts.bid_escrow.to_account_info().try_borrow_mut_lamports()? -= platform_share;
    **ctx.accounts.platform_wallet.to_account_info().try_borrow_mut_lamports()? += platform_share;

    // 1% to collection distribution pool
    **ctx.accounts.bid_escrow.to_account_info().try_borrow_mut_lamports()? -= collection_share;
    collection_distribution.add_fees(collection_share);

    // Transfer NFT from lister to bidder
    let transfer_instruction = Transfer {
        from: ctx.accounts.lister_token_account.to_account_info(),
        to: ctx.accounts.bidder_token_account.to_account_info(),
        authority: ctx.accounts.lister.to_account_info(),
    };

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        ),
        1, // Transfer 1 NFT
    )?;

    // Update bid status
    bid.status = BidStatus::Accepted;

    // Update bid listing status
    bid_listing.status = BidListingStatus::Accepted;

    // Update minter tracker
    minter_tracker.add_revenue(minter_share);

    // Emit event
    emit!(BidAccepted {
        bid_id,
        nft_mint: ctx.accounts.nft_mint.key(),
        bidder: bid.bidder,
        original_minter: ctx.accounts.minter.key(),
        lister: bid_listing.lister,
        amount: total_amount,
        minter_share,
        platform_share,
        collection_share,
        timestamp: current_timestamp,
    });

    msg!("Bid accepted successfully!");
    msg!("Bid ID: {}", bid_id);
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Bidder: {}", bid.bidder);
    msg!("Original Minter: {}", ctx.accounts.minter.key());
    msg!("Total Amount: {} lamports", total_amount);
    msg!("Minter Share (95%): {} lamports", minter_share);
    msg!("Platform Share (4%): {} lamports", platform_share);
    msg!("Collection Share (1%): {} lamports", collection_share);

    Ok(())
}

