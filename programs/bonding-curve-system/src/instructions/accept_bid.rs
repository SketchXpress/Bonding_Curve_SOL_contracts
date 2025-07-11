use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

use crate::{
    constants::*,
    errors::ErrorCode,
    state::*,
    utils::*,
    debug_log,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AcceptBidArgs {
    pub bid_id: u64,
}

#[derive(Accounts)]
#[instruction(args: AcceptBidArgs)]
pub struct AcceptBid<'info> {
    #[account(mut)]
    pub original_minter: Signer<'info>,

    #[account(
        mut,
        constraint = bid_listing.lister == original_minter.key() @ ErrorCode::Unauthorized
    )]
    pub bid_listing: Account<'info, BidListing>,

    #[account(
        mut,
        constraint = bid.bid_id == args.bid_id @ ErrorCode::InvalidAccount,
        constraint = bid.status == BidStatus::Active @ ErrorCode::InvalidAccount
    )]
    pub bid: Account<'info, Bid>,

    #[account(
        constraint = minter_tracker.nft_mint == bid.nft_mint @ ErrorCode::InvalidNftMint,
        constraint = minter_tracker.original_minter == original_minter.key() @ ErrorCode::Unauthorized
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    #[account(mut)]
    pub bidder_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bid_escrow: Account<'info, TokenAccount>,

    #[account(mut)]
    pub minter_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn accept_bid(ctx: Context<AcceptBid>, args: AcceptBidArgs) -> Result<()> {
    let mut debug_ctx = DebugContext::new("accept_bid");
    debug_ctx.add_data("bid_id", &args.bid_id.to_string());
    debug_log!(debug_ctx, LogLevel::Info, "Starting bid acceptance");

    // Step 1: Validate bid and timing
    validate_bid_acceptance(&ctx, &mut debug_ctx)?;

    // Step 2: Calculate revenue distribution
    let distribution = calculate_revenue_distribution(ctx.accounts.bid.amount, &mut debug_ctx)?;

    // Step 3: Execute revenue distribution
    execute_revenue_distribution(&ctx, &distribution, &mut debug_ctx)?;

    // Step 4: Transfer NFT ownership
    transfer_nft_ownership(&ctx, &mut debug_ctx)?;

    // Step 5: Update account states
    update_account_states(&ctx, &mut debug_ctx)?;

    debug_log!(debug_ctx, LogLevel::Info, "Bid acceptance completed successfully");
    Ok(())
}

// === HELPER FUNCTIONS ===

fn validate_bid_acceptance(ctx: &Context<AcceptBid>, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("bid_validation");
    
    let current_time = Clock::get()?.unix_timestamp;
    
    // Check if bid is still valid
    if ctx.accounts.bid.expires_at < current_time {
        debug_log!(debug_ctx, LogLevel::Error, "Bid has expired");
        return Err(ErrorCode::BidExpired.into());
    }

    // Check if listing is still active
    if ctx.accounts.bid_listing.status != ListingStatus::Active {
        debug_log!(debug_ctx, LogLevel::Error, "Listing is not active");
        return Err(ErrorCode::InvalidListingStatus.into());
    }

    // Verify bidder is not the minter
    if ctx.accounts.bid.bidder == ctx.accounts.original_minter.key() {
        debug_log!(debug_ctx, LogLevel::Error, "Minter cannot accept own bid");
        return Err(ErrorCode::CannotBidOnOwnNft.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Bid validation passed");
    Ok(())
}

#[derive(Debug)]
struct RevenueDistribution {
    total_amount: u64,
    minter_amount: u64,
    platform_amount: u64,
    collection_amount: u64,
}

fn calculate_revenue_distribution(total_amount: u64, debug_ctx: &mut DebugContext) -> Result<RevenueDistribution> {
    debug_ctx.step("revenue_calculation");
    
    // Calculate 95% to minter
    let minter_amount = total_amount
        .checked_mul(MINTER_REVENUE_PERCENTAGE as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow)?;

    // Calculate 4% to platform
    let platform_amount = total_amount
        .checked_mul(PLATFORM_REVENUE_PERCENTAGE as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow)?;

    // Calculate 1% to collection
    let collection_amount = total_amount
        .checked_mul(COLLECTION_REVENUE_PERCENTAGE as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow)?;

    let distribution = RevenueDistribution {
        total_amount,
        minter_amount,
        platform_amount,
        collection_amount,
    };

    debug_log!(
        debug_ctx,
        LogLevel::Debug,
        "Revenue distribution - Minter: {}, Platform: {}, Collection: {}",
        distribution.minter_amount,
        distribution.platform_amount,
        distribution.collection_amount
    );

    Ok(distribution)
}

fn execute_revenue_distribution(
    ctx: &Context<AcceptBid>,
    distribution: &RevenueDistribution,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("revenue_distribution");
    
    // Transfer to original minter (95%)
    transfer_from_escrow(
        &ctx.accounts.bid_escrow,
        &ctx.accounts.minter_token_account,
        &ctx.accounts.bid,
        &ctx.accounts.token_program,
        distribution.minter_amount,
        "minter_payment",
        debug_ctx,
    )?;

    // Transfer to platform (4%)
    transfer_from_escrow(
        &ctx.accounts.bid_escrow,
        &ctx.accounts.platform_fee_account,
        &ctx.accounts.bid,
        &ctx.accounts.token_program,
        distribution.platform_amount,
        "platform_fee",
        debug_ctx,
    )?;

    // Add to collection distribution pool (1%)
    add_to_collection_pool(
        ctx,
        distribution.collection_amount,
        debug_ctx,
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "Revenue distribution completed");
    Ok(())
}

fn transfer_from_escrow(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &Account<Bid>,
    token_program: &Program<Token>,
    amount: u64,
    transfer_type: &str,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    let seeds = &[
        b"bid",
        authority.nft_mint.as_ref(),
        authority.bidder.as_ref(),
        &[authority.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    debug_log!(debug_ctx, LogLevel::Debug, "Transfer completed - {}: {}", transfer_type, amount);
    Ok(())
}

fn add_to_collection_pool(
    ctx: &Context<AcceptBid>,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("collection_pool_update");
    
    let collection_dist = &mut ctx.accounts.collection_distribution;
    collection_dist.pending_distribution = collection_dist
        .pending_distribution
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    collection_dist.total_sales = collection_dist
        .total_sales
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;

    debug_log!(
        debug_ctx,
        LogLevel::Debug,
        "Collection pool updated - Pending: {}, Total Sales: {}",
        collection_dist.pending_distribution,
        collection_dist.total_sales
    );
    Ok(())
}

fn transfer_nft_ownership(ctx: &Context<AcceptBid>, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("nft_transfer");
    
    // Transfer NFT from current owner to bidder
    let cpi_accounts = Transfer {
        from: ctx.accounts.minter_token_account.to_account_info(),
        to: ctx.accounts.bidder_token_account.to_account_info(),
        authority: ctx.accounts.original_minter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    anchor_spl::token::transfer(cpi_ctx, 1)?;

    debug_log!(debug_ctx, LogLevel::Debug, "NFT ownership transferred to bidder");
    Ok(())
}

fn update_account_states(ctx: &Context<AcceptBid>, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("state_updates");
    
    // Update bid status
    let bid = &mut ctx.accounts.bid;
    bid.status = BidStatus::Accepted;
    bid.accepted_at = Some(Clock::get()?.unix_timestamp);

    // Update listing status
    let listing = &mut ctx.accounts.bid_listing;
    listing.status = ListingStatus::Sold;
    listing.sold_at = Some(Clock::get()?.unix_timestamp);
    listing.final_price = Some(bid.amount);

    debug_log!(debug_ctx, LogLevel::Debug, "Account states updated");
    Ok(())
}

