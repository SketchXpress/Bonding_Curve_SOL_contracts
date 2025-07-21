use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::state::{BondingCurvePool, NFTData, UserAccount};
use crate::ErrorCode;

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub buyer_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub seller_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub nft_data: Account<'info, NFTData>,
    
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub seller_nft_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    
    #[account(mut)]
    pub buyer_nft_token_account: Account<'info, anchor_spl::token::TokenAccount>,
    
    #[account(mut)]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct BuyNftArgs {
    // Add any specific arguments needed for buy_nft
    pub max_price: Option<u64>,
}

pub fn buy_nft(ctx: Context<BuyNft>, args: BuyNftArgs) -> Result<()> {
    // Verify NFT ownership
    require!(
        ctx.accounts.nft_data.owner == ctx.accounts.seller_account.key(),
        ErrorCode::InvalidAuthority
    );
    
    // Verify NFT is not already sold
    require!(
        ctx.accounts.seller_nft_token_account.amount > 0,
        ErrorCode::NFTAlreadySold
    );
    
    // Calculate price based on pool state and NFT data
    let price = calculate_nft_price(&ctx.accounts.nft_data, &ctx.accounts.pool)?;
    
    // Check if price exceeds max_price if specified
    if let Some(max_price) = args.max_price {
        require!(
            price <= max_price,
            ErrorCode::PriceExceedsMaximum
        );
    }
    
    // Check if buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= price,
        ErrorCode::InsufficientFunds
    );
    
    // Transfer SOL from buyer to seller
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.buyer.key(),
        &ctx.accounts.seller_account.key(),
        price,
    );
    
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.buyer.to_account_info(),
            ctx.accounts.seller_account.to_account_info(),
        ],
    )?;
    
    // Transfer NFT from seller to buyer
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_nft_token_account.to_account_info(),
                to: ctx.accounts.buyer_nft_token_account.to_account_info(),
                authority: ctx.accounts.seller_account.to_account_info(),
            },
        ),
        1, // NFTs have amount of 1
    )?;
    
    // Update NFT data
    ctx.accounts.nft_data.owner = ctx.accounts.buyer.key();
    ctx.accounts.nft_data.last_price = price;
    
    // Update buyer account statistics
    ctx.accounts.buyer_account.total_nfts_bought = ctx.accounts.buyer_account.total_nfts_bought.saturating_add(1);
    ctx.accounts.buyer_account.total_volume_bought = ctx.accounts.buyer_account.total_volume_bought.saturating_add(price);
    
    // Update seller account statistics
    ctx.accounts.seller_account.total_nfts_sold = ctx.accounts.seller_account.total_nfts_sold.saturating_add(1);
    ctx.accounts.seller_account.total_volume_sold = ctx.accounts.seller_account.total_volume_sold.saturating_add(price);
    
    // Update pool statistics
    ctx.accounts.pool.stats.record_trade(price)?;
    
    msg!("NFT sold successfully for {} lamports", price);
    
    Ok(())
}

// Helper function to calculate NFT price
fn calculate_nft_price(nft_data: &NFTData, pool: &BondingCurvePool) -> Result<u64> {
    // Start with the last price as base
    let base_price = if nft_data.last_price > 0 {
        nft_data.last_price
    } else {
        // Default price if no previous sales
        1_000_000 // 0.001 SOL in lamports
    };
    
    // Apply pool growth factor
    let growth_factor = pool.growth_factor.checked_div(1_000_000).unwrap_or(1);
    
    let price = base_price.checked_mul(growth_factor)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Cap the price at a reasonable maximum
    let max_price = 1_000_000_000; // 1 SOL in lamports
    let final_price = std::cmp::min(price, max_price);
    
    Ok(final_price)
}

// Helper function to calculate fee
fn calculate_fee(price: u64) -> Result<u64> {
    // Example: 2.5% fee
    let fee_numerator = 25;
    let fee_denominator = 1000;
    
    let fee = price.checked_mul(fee_numerator)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(fee_denominator)
        .ok_or(ErrorCode::MathOverflow)?;
    
    Ok(fee)
}

// Helper function to determine if we should set past threshold
fn should_set_past_threshold(pool: &BondingCurvePool, transaction_amount: u64) -> bool {
    // Example threshold condition based on transaction amount and current state
    let new_market_cap = pool.stats.market_cap.saturating_add(transaction_amount);
    new_market_cap > 1_000_000_000 && pool.state.current_supply > 1_000_000
}
