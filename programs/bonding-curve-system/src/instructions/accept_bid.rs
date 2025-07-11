use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

use crate::state::{
    BidListing, Bid, BondingCurvePool, MinterTracker, CollectionDistribution,
    BidListingStatus, BidStatus,
};
use crate::utils::{
    validation::{AccountValidator, BusinessValidator},
    transfers::{SolTransfer, TokenTransfer, EscrowManager},
};
use crate::errors::ErrorCode;

/// Arguments for accepting a bid
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AcceptBidArgs {
    /// The bid ID to accept
    pub bid_id: u64,
}

/// Accounts required for accepting a bid
#[derive(Accounts)]
#[instruction(args: AcceptBidArgs)]
pub struct AcceptBid<'info> {
    /// The original minter who accepts the bid (gets 95%)
    #[account(mut)]
    pub minter: Signer<'info>,

    /// The current NFT owner (transfers NFT to bidder)
    #[account(mut)]
    pub current_owner: Signer<'info>,

    /// The winning bidder (receives the NFT)
    /// CHECK: Validated through bid account
    #[account(mut)]
    pub bidder: AccountInfo<'info>,

    /// Platform fee recipient (gets 4%)
    /// CHECK: Validated through pool configuration
    #[account(mut)]
    pub platform_fee_recipient: AccountInfo<'info>,

    /// The NFT mint being transferred
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bonding curve pool
    #[account(
        mut,
        seeds = [b"pool", collection_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,

    /// Collection mint for the NFT
    pub collection_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bid listing being resolved
    #[account(
        mut,
        seeds = [b"bid-listing", nft_mint.key().as_ref()],
        bump,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::InvalidListingStatus,
    )]
    pub bid_listing: Account<'info, BidListing>,

    /// The winning bid being accepted
    #[account(
        mut,
        seeds = [
            b"bid",
            nft_mint.key().as_ref(),
            &args.bid_id.to_le_bytes(),
        ],
        bump,
        constraint = bid.status == BidStatus::Active @ ErrorCode::InvalidBidStatus,
        constraint = bid.amount == bid_listing.highest_bid @ ErrorCode::InvalidBidAmount,
    )]
    pub bid: Account<'info, Bid>,

    /// Escrow account holding the bid amount
    #[account(
        mut,
        seeds = [b"bid-escrow", bid.key().as_ref()],
        bump,
    )]
    pub bid_escrow: SystemAccount<'info>,

    /// Minter tracker to verify original minter
    #[account(
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump,
        constraint = minter_tracker.original_minter == minter.key() @ ErrorCode::Unauthorized,
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// Collection distribution account for 1% fee
    #[account(
        mut,
        seeds = [b"collection-distribution", collection_mint.key().as_ref()],
        bump,
    )]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    /// Current owner's token account (source)
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = current_owner,
        constraint = current_owner_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance,
    )]
    pub current_owner_token_account: Account<'info, TokenAccount>,

    /// Bidder's token account (destination)
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = bidder,
    )]
    pub bidder_token_account: Account<'info, TokenAccount>,

    /// System program for SOL transfers
    pub system_program: Program<'info, System>,
    
    /// Token program for NFT transfer
    pub token_program: Program<'info, Token>,
}

/// Accept a bid and execute the complete transaction
pub fn accept_bid(ctx: Context<AcceptBid>, args: AcceptBidArgs) -> Result<()> {
    let minter = &ctx.accounts.minter;
    let current_owner = &ctx.accounts.current_owner;
    let bidder = &ctx.accounts.bidder;
    let platform_fee_recipient = &ctx.accounts.platform_fee_recipient;
    let nft_mint = &ctx.accounts.nft_mint;
    let pool = &mut ctx.accounts.pool;
    let bid_listing = &mut ctx.accounts.bid_listing;
    let bid = &mut ctx.accounts.bid;
    let bid_escrow = &ctx.accounts.bid_escrow;
    let collection_distribution = &mut ctx.accounts.collection_distribution;
    let current_owner_token_account = &ctx.accounts.current_owner_token_account;
    let bidder_token_account = &ctx.accounts.bidder_token_account;

    let current_time = Clock::get()?.unix_timestamp;

    // === VALIDATION PHASE ===
    
    // 1. Validate bid is not expired
    AccountValidator::validate_not_expired(bid.expires_at, current_time)?;

    // 2. Validate bidder matches bid account
    require_keys_eq!(bid.bidder, bidder.key(), ErrorCode::InvalidAccount);

    // 3. Validate current owner is authorized to transfer
    require_keys_eq!(
        bid_listing.lister,
        current_owner.key(),
        ErrorCode::Unauthorized
    );

    // 4. Validate escrow has sufficient funds
    require!(
        bid_escrow.lamports() >= bid.amount,
        ErrorCode::InsufficientEscrowBalance
    );

    // === REVENUE DISTRIBUTION (95%/4%/1%) ===
    
    let total_amount = bid.amount;
    let (minter_share, platform_share, collection_share) = 
        pool.curve_params.revenue_distribution.calculate_shares(total_amount)?;

    // 5. Transfer 95% to original minter
    EscrowManager::transfer_escrow_to_recipient(
        &bid_escrow.to_account_info(),
        &minter.to_account_info(),
        minter_share,
    )?;

    // 6. Transfer 4% to platform
    EscrowManager::transfer_escrow_to_recipient(
        &bid_escrow.to_account_info(),
        platform_fee_recipient,
        platform_share,
    )?;

    // 7. Add 1% to collection distribution pool
    collection_distribution.add_fees(collection_share)?;
    EscrowManager::transfer_escrow_to_recipient(
        &bid_escrow.to_account_info(),
        &collection_distribution.to_account_info(),
        collection_share,
    )?;

    // === NFT TRANSFER ===
    
    // 8. Transfer NFT from current owner to bidder
    TokenTransfer::transfer_nft(
        current_owner_token_account,
        bidder_token_account,
        &current_owner.to_account_info(),
        &ctx.accounts.token_program,
    )?;

    // === STATE UPDATES ===
    
    // 9. Update bid status
    bid.accept(current_time)?;

    // 10. Update listing status
    bid_listing.accept_bid(bid.amount, current_time)?;

    // 11. Update pool statistics
    pool.add_platform_fees(platform_share)?;

    // === ANALYTICS & EVENTS ===
    
    // 12. Calculate analytics
    let premium_percentage = bid_listing.calculate_premium_percentage(bid.amount);
    let bonding_curve_price = crate::utils::pricing::DynamicPricing::get_current_bonding_curve_price(pool)?;

    // 13. Emit comprehensive event
    emit!(BidAcceptedEvent {
        bid_id: args.bid_id,
        nft_mint: nft_mint.key(),
        minter: minter.key(),
        current_owner: current_owner.key(),
        bidder: bidder.key(),
        total_amount,
        minter_share,
        platform_share,
        collection_share,
        premium_percentage,
        bonding_curve_price,
        timestamp: current_time,
        revenue_breakdown: RevenueBreakdownEvent {
            minter_percentage: 9500, // 95%
            platform_percentage: 400, // 4%
            collection_percentage: 100, // 1%
        },
    });

    // 14. Log transaction details
    msg!(
        "Bid accepted: {} SOL | Minter: {} SOL (95%) | Platform: {} SOL (4%) | Collection: {} SOL (1%) | Premium: {}%",
        total_amount as f64 / 1_000_000_000.0,
        minter_share as f64 / 1_000_000_000.0,
        platform_share as f64 / 1_000_000_000.0,
        collection_share as f64 / 1_000_000_000.0,
        premium_percentage / 100 // Convert basis points to percentage
    );

    // === CLEANUP ===
    
    // 15. Verify escrow is properly emptied
    require!(
        bid_escrow.lamports() < 1_000_000, // Allow for small dust (< 0.001 SOL)
        ErrorCode::EscrowNotEmpty
    );

    Ok(())
}

/// Event emitted when a bid is accepted
#[event]
pub struct BidAcceptedEvent {
    /// Accepted bid ID
    pub bid_id: u64,
    /// NFT mint that was sold
    pub nft_mint: Pubkey,
    /// Original minter (receives 95%)
    pub minter: Pubkey,
    /// Current owner who accepted the bid
    pub current_owner: Pubkey,
    /// Winning bidder (receives NFT)
    pub bidder: Pubkey,
    /// Total transaction amount
    pub total_amount: u64,
    /// Amount sent to minter (95%)
    pub minter_share: u64,
    /// Amount sent to platform (4%)
    pub platform_share: u64,
    /// Amount sent to collection (1%)
    pub collection_share: u64,
    /// Premium percentage over bonding curve
    pub premium_percentage: u64,
    /// Current bonding curve price
    pub bonding_curve_price: u64,
    /// Transaction timestamp
    pub timestamp: i64,
    /// Revenue distribution breakdown
    pub revenue_breakdown: RevenueBreakdownEvent,
}

/// Revenue breakdown for events
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RevenueBreakdownEvent {
    /// Minter percentage (basis points)
    pub minter_percentage: u16,
    /// Platform percentage (basis points)
    pub platform_percentage: u16,
    /// Collection percentage (basis points)
    pub collection_percentage: u16,
}

// === INSTRUCTION VALIDATION HELPERS ===

impl AcceptBidArgs {
    /// Validate the arguments before processing
    pub fn validate(&self) -> Result<()> {
        // Validate bid ID is not zero
        require!(self.bid_id > 0, ErrorCode::InvalidBidAmount);
        Ok(())
    }
}

impl<'info> AcceptBid<'info> {
    /// Additional context validation
    pub fn validate_context(&self) -> Result<()> {
        // Ensure pool is active
        require!(self.pool.is_active, ErrorCode::PoolInactive);
        
        // Ensure NFT mint is valid
        require!(self.nft_mint.supply == 1, ErrorCode::InvalidNftMint);
        
        // Ensure bid belongs to this NFT
        require_keys_eq!(
            self.bid.nft_mint,
            self.nft_mint.key(),
            ErrorCode::InvalidAccount
        );

        // Ensure bid amount matches listing highest bid
        require_eq!(
            self.bid.amount,
            self.bid_listing.highest_bid,
            ErrorCode::InvalidBidAmount
        );

        Ok(())
    }

    /// Validate revenue distribution setup
    pub fn validate_revenue_setup(&self) -> Result<()> {
        // Validate minter tracker points to correct minter
        require_keys_eq!(
            self.minter_tracker.original_minter,
            self.minter.key(),
            ErrorCode::Unauthorized
        );

        // Validate collection distribution is for correct collection
        require_keys_eq!(
            self.collection_distribution.collection_mint,
            self.collection_mint.key(),
            ErrorCode::InvalidAccount
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_accept_bid_args_validation() {
        // Valid args
        let valid_args = AcceptBidArgs { bid_id: 1 };
        assert!(valid_args.validate().is_ok());

        // Invalid args (zero bid ID)
        let invalid_args = AcceptBidArgs { bid_id: 0 };
        assert!(invalid_args.validate().is_err());
    }

    #[test]
    fn test_revenue_calculation() {
        let total = 1_000_000_000; // 1 SOL
        let distribution = crate::state::types::RevenueDistribution::default();
        let (minter, platform, collection) = distribution.calculate_shares(total).unwrap();
        
        assert_eq!(minter, 950_000_000); // 0.95 SOL
        assert_eq!(platform, 40_000_000); // 0.04 SOL
        assert_eq!(collection, 10_000_000); // 0.01 SOL
        assert_eq!(minter + platform + collection, total);
    }
}

