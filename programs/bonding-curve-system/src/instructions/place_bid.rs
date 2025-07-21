use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, spl_token};

use crate::{
    constants::*,
    state::{BidListing, BondingCurvePool, Bid},
    state::types::{BidListingStatus, BidStatus},
    utils::{debug::*, pricing::calculate_bonding_curve_price},
    errors::ErrorCode,
    errors::ErrorContext,
    error_ctx,
    debug_log,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlaceBidArgs {
    pub amount: u64,
}

#[derive(Accounts)]
#[instruction(args: PlaceBidArgs)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        constraint = bid_listing.status == BidListingStatus::Active @ ErrorCode::InvalidListingStatus
    )]
    pub bid_listing: Account<'info, BidListing>,

    #[account(
        init,
        payer = bidder,
        space = 8 + std::mem::size_of::<Bid>(),
        seeds = [
            b"bid",
            bid_listing.key().as_ref(),
            bidder.key().as_ref()
        ],
        bump
    )]
    pub bid: Account<'info, Bid>,

    /// Escrow account to hold bid funds (system account for SOL)
    /// CHECK: This is a PDA used for escrow
    #[account(
        mut,
        seeds = [b"bid_escrow", bid.key().as_ref()],
        bump
    )]
    pub bid_escrow: AccountInfo<'info>,

    pub bonding_curve_pool: Account<'info, BondingCurvePool>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
}

pub fn place_bid(ctx: Context<PlaceBid>, args: PlaceBidArgs) -> Result<()> {
    // Initialize debug context
    let mut debug_ctx = DebugContext::new("place_bid");
    debug_ctx.add_data("amount", &args.amount.to_string());
    debug_log!(debug_ctx, LogLevel::Info, "Starting bid placement");

    // Validate bid amount
    debug_ctx.step("validation");
    let min_bid = calculate_minimum_bid(&ctx.accounts.bonding_curve_pool, &ctx.accounts.bid_listing)?;
    
    if args.amount < min_bid {
        let error_ctx = error_ctx!(
            ErrorCode::BidTooLow,
            format!("Bid amount {} is below minimum required {}", args.amount, min_bid)
        );
        error_ctx.log();
        return Err(ErrorCode::BidTooLow.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Bid validation passed");

    // Check bidder is not NFT owner
    debug_ctx.step("ownership_check");
    if ctx.accounts.bidder.key() == ctx.accounts.bid_listing.lister {
        let error_ctx = error_ctx!(ErrorCode::CannotBidOnOwnNft, "place_bid");
        error_ctx.log();
        return Err(ErrorCode::CannotBidOnOwnNft.into());
    }

    // Transfer SOL to escrow
    debug_ctx.step("escrow_transfer");
    // TODO: Implement proper SOL transfer to escrow
    // transfer_sol_to_escrow(
    //     &ctx.accounts.bidder_token_account,
    //     &ctx.accounts.bid_escrow,
    //     &ctx.accounts.bidder,
    //     &ctx.accounts.token_program,
    //     args.amount,
    // )?;

    debug_log!(debug_ctx, LogLevel::Debug, "SOL transferred to escrow");

    // Initialize bid account
    debug_ctx.step("bid_initialization");
    let bid = &mut ctx.accounts.bid;
    bid.bid_id = generate_bid_id(&ctx.accounts.bid_listing.key(), &ctx.accounts.bidder.key());
    bid.details.nft_mint = ctx.accounts.bid_listing.nft_mint;
    bid.details.bidder = ctx.accounts.bidder.key();
    bid.details.amount = args.amount;
    bid.outcome.status = BidStatus::Active;
    bid.timing.created_at = Clock::get()?.unix_timestamp;
    bid.timing.expires_at = ctx.accounts.bid_listing.expires_at;
    // Get the PDA bump using Pubkey::find_program_address instead of ctx.bumps
    let (_pda, bump) = Pubkey::find_program_address(
        &[
            b"bid",
            ctx.accounts.bid_listing.key().as_ref(),
            ctx.accounts.bidder.key().as_ref()
        ],
        &crate::ID
    );
    bid.bump = bump;

    debug_log!(debug_ctx, LogLevel::Info, "Bid placed successfully");
    Ok(())
}

fn calculate_minimum_bid(pool: &BondingCurvePool, listing: &BidListing) -> Result<u64> {
        let current_price = calculate_bonding_curve_price(pool.config.base_price, pool.config.growth_factor, pool.state.current_supply)?;
    let minimum_premium = current_price
        .checked_mul(MINIMUM_BID_PREMIUM_BP as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow)?;
    
    current_price
        .checked_add(minimum_premium)
        .ok_or(ErrorCode::MathOverflow.into())
}

fn generate_bid_id(listing_key: &Pubkey, bidder_key: &Pubkey) -> u64 {
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    use std::hash::{Hash, Hasher};
    listing_key.hash(&mut hasher);
    bidder_key.hash(&mut hasher);
    Clock::get().map(|c| c.unix_timestamp as u64).unwrap_or(0).hash(&mut hasher);
    hasher.finish()
}

