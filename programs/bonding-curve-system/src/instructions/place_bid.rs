use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::state::{BidListing, Bid, BondingCurvePool, BidStatus};
use crate::utils::{
    validation::{AccountValidator, BusinessValidator},
    transfers::EscrowManager,
    pricing::DynamicPricing,
};
use crate::errors::ErrorCode;

/// Arguments for placing a bid
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PlaceBidArgs {
    /// Unique identifier for this bid
    pub bid_id: u64,
    /// Bid amount in lamports
    pub amount: u64,
    /// Optional duration in seconds (None = no expiry)
    pub duration_seconds: Option<i64>,
}

/// Accounts required for placing a bid
#[derive(Accounts)]
#[instruction(args: PlaceBidArgs)]
pub struct PlaceBid<'info> {
    /// The bidder placing the bid
    #[account(mut)]
    pub bidder: Signer<'info>,

    /// The NFT mint being bid on
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// The bonding curve pool for dynamic pricing validation
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

    /// System program for account creation and transfers
    pub system_program: Program<'info, System>,
    
    /// Token program for token operations
    pub token_program: Program<'info, Token>,
}

/// Place a bid on an NFT listing
pub fn place_bid(ctx: Context<PlaceBid>, args: PlaceBidArgs) -> Result<()> {
    let bidder = &ctx.accounts.bidder;
    let nft_mint = &ctx.accounts.nft_mint;
    let pool = &ctx.accounts.pool;
    let bid_listing = &mut ctx.accounts.bid_listing;
    let bid = &mut ctx.accounts.bid;
    let bid_escrow = &ctx.accounts.bid_escrow;
    let bidder_token_account = &ctx.accounts.bidder_token_account;

    let current_time = Clock::get()?.unix_timestamp;

    // === VALIDATION PHASE ===
    
    // 1. Validate listing is active and not expired
    require!(
        bid_listing.is_active(current_time),
        ErrorCode::BidListingNotActive
    );

    // 2. Validate bidder doesn't own the NFT
    AccountValidator::validate_nft_ownership(
        bidder_token_account,
        &bidder.key(),
        &nft_mint.key(),
    ).unwrap_or_else(|_| {
        // If validation fails, it means they don't own it (which is what we want)
        // But we need to check they have 0 amount
        require!(
            bidder_token_account.amount == 0,
            ErrorCode::CannotBidOnOwnNft
        );
        Ok(())
    })?;

    // 3. Validate bidder has sufficient funds
    AccountValidator::validate_sol_balance(&bidder.to_account_info(), args.amount)?;

    // 4. Validate bid duration
    let bid_duration = BusinessValidator::validate_duration_seconds(args.duration_seconds)?;
    let bid_expires_at = if bid_duration > 0 {
        current_time + bid_duration
    } else {
        0 // No expiry
    };

    // === DYNAMIC PRICING VALIDATION ===
    
    // 5. Validate bid amount against dynamic pricing rules
    DynamicPricing::validate_dynamic_bid_amount(
        args.amount,
        pool,
        bid_listing.highest_bid,
        pool.pricing_config.minimum_premium_bp,
        pool.pricing_config.bid_increment_bp,
    )?;

    // 6. Update listing's bonding curve price if needed
    let current_bonding_curve_price = DynamicPricing::get_current_bonding_curve_price(pool)?;
    if current_bonding_curve_price != bid_listing.current_bonding_curve_price {
        bid_listing.update_minimum_bid(
            current_bonding_curve_price,
            &pool.pricing_config,
            current_time,
        )?;
    }

    // === BID CREATION ===
    
    // 7. Initialize bid account
    bid.initialize(
        args.bid_id,
        nft_mint.key(),
        bidder.key(),
        args.amount,
        current_time,
        bid_expires_at,
        ctx.bumps.bid,
    )?;

    // 8. Create escrow for bid amount
    EscrowManager::create_bid_escrow(
        &bidder.to_account_info(),
        &bid_escrow.to_account_info(),
        args.amount,
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // === UPDATE LISTING ===
    
    // 9. Update bid listing with new bid
    bid_listing.place_bid(
        bidder.key(),
        args.amount,
        &pool.pricing_config,
        current_time,
    )?;

    // === ANALYTICS & EVENTS ===
    
    // 10. Calculate analytics
    let premium_percentage = bid_listing.calculate_premium_percentage(args.amount);
    let value_analysis = DynamicPricing::calculate_bid_value_analysis(args.amount, pool)?;

    // 11. Emit comprehensive event
    emit!(BidPlacedEvent {
        bid_id: args.bid_id,
        nft_mint: nft_mint.key(),
        bidder: bidder.key(),
        amount: args.amount,
        bonding_curve_price: current_bonding_curve_price,
        premium_percentage,
        expires_at: bid_expires_at,
        timestamp: current_time,
        listing_total_bids: bid_listing.total_bids,
        is_highest_bid: args.amount == bid_listing.highest_bid,
        value_analysis: BidValueAnalysisEvent {
            is_profitable: value_analysis.is_profitable,
            premium_amount: value_analysis.premium_amount,
        },
    });

    // 12. Log transaction details
    msg!(
        "Bid placed successfully: {} SOL on NFT {} | Bonding curve: {} SOL | Premium: {}% | Total bids: {}",
        args.amount as f64 / 1_000_000_000.0,
        nft_mint.key(),
        current_bonding_curve_price as f64 / 1_000_000_000.0,
        premium_percentage / 100, // Convert basis points to percentage
        bid_listing.total_bids
    );

    Ok(())
}

/// Event emitted when a bid is placed
#[event]
pub struct BidPlacedEvent {
    /// Unique bid identifier
    pub bid_id: u64,
    /// NFT mint being bid on
    pub nft_mint: Pubkey,
    /// Bidder's public key
    pub bidder: Pubkey,
    /// Bid amount in lamports
    pub amount: u64,
    /// Current bonding curve price
    pub bonding_curve_price: u64,
    /// Premium percentage over bonding curve (basis points)
    pub premium_percentage: u64,
    /// Bid expiration timestamp (0 = no expiry)
    pub expires_at: i64,
    /// Transaction timestamp
    pub timestamp: i64,
    /// Total number of bids on this listing
    pub listing_total_bids: u32,
    /// Whether this is the new highest bid
    pub is_highest_bid: bool,
    /// Value analysis for this bid
    pub value_analysis: BidValueAnalysisEvent,
}

/// Value analysis data for events
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BidValueAnalysisEvent {
    /// Whether the bid is above bonding curve price
    pub is_profitable: bool,
    /// Premium amount over bonding curve price
    pub premium_amount: u64,
}

// === INSTRUCTION VALIDATION HELPERS ===

impl PlaceBidArgs {
    /// Validate the arguments before processing
    pub fn validate(&self) -> Result<()> {
        // Validate bid amount is not zero
        require!(self.amount > 0, ErrorCode::InvalidBidAmount);

        // Validate bid amount is reasonable (not too high to prevent overflow)
        require!(
            self.amount <= 1_000_000 * 1_000_000_000, // 1M SOL max
            ErrorCode::InvalidBidAmount
        );

        // Validate duration if provided
        if let Some(duration) = self.duration_seconds {
            require!(
                duration > 0 && duration <= 604800, // Max 1 week
                ErrorCode::InvalidDuration
            );
        }

        Ok(())
    }
}

impl<'info> PlaceBid<'info> {
    /// Additional context validation
    pub fn validate_context(&self) -> Result<()> {
        // Ensure pool is active
        require!(self.pool.is_active, ErrorCode::PoolInactive);
        
        // Ensure pool is not migrated
        require!(!self.pool.is_migrated, ErrorCode::AlreadyMigrated);
        
        // Ensure NFT mint is valid
        require!(self.nft_mint.supply == 1, ErrorCode::InvalidNftMint);
        
        // Ensure bid listing belongs to this NFT
        require_keys_eq!(
            self.bid_listing.nft_mint,
            self.nft_mint.key(),
            ErrorCode::InvalidAccount
        );

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_place_bid_args_validation() {
        // Valid args
        let valid_args = PlaceBidArgs {
            bid_id: 1,
            amount: 1_000_000_000, // 1 SOL
            duration_seconds: Some(3600), // 1 hour
        };
        assert!(valid_args.validate().is_ok());

        // Invalid amount (zero)
        let invalid_args = PlaceBidArgs {
            bid_id: 1,
            amount: 0,
            duration_seconds: Some(3600),
        };
        assert!(invalid_args.validate().is_err());

        // Invalid duration (too long)
        let invalid_duration = PlaceBidArgs {
            bid_id: 1,
            amount: 1_000_000_000,
            duration_seconds: Some(700000), // More than 1 week
        };
        assert!(invalid_duration.validate().is_err());
    }
}

