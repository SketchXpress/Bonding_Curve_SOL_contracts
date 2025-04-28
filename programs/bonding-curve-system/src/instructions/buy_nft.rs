use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::state::BondingCurvePool;

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub buyer_account: Account<'info, crate::state::UserAccount>,
    
    #[account(mut)]
    pub seller_account: Account<'info, crate::state::UserAccount>,
    
    #[account(mut)]
    pub nft_data: Account<'info, crate::state::NFTData>,
    
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

pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
    // Verify NFT ownership
    require!(
        ctx.accounts.nft_data.owner == ctx.accounts.seller_account.key(),
        crate::errors::ErrorCode::InvalidAuthority
    );
    
    // Verify NFT is not already sold
    require!(
        ctx.accounts.seller_nft_token_account.amount > 0,
        crate::errors::ErrorCode::NFTAlreadySold
    );
    
    // Calculate price based on pool state and NFT data
    let price = calculate_nft_price(&ctx.accounts.nft_data, &ctx.accounts.pool)?;
    
    // Check if buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= price,
        crate::errors::ErrorCode::InsufficientFunds
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
    
    // Update buyer account
    ctx.accounts.buyer_account.owned_nfts.push(ctx.accounts.nft_data.key());
    
    // Update seller account - remove NFT from owned_nfts
    let nft_key = ctx.accounts.nft_data.key();
    if let Some(index) = ctx.accounts.seller_account.owned_nfts.iter().position(|x| *x == nft_key) {
        ctx.accounts.seller_account.owned_nfts.remove(index);
    }
    
    // Update pool state if needed based on threshold
    if ctx.accounts.pool.is_past_threshold() {
        // If past threshold, update distribution metrics
        let fee = calculate_fee(price)?;
        
        // Update total distributed
        ctx.accounts.pool.total_distributed = ctx.accounts.pool.total_distributed
            .checked_add(fee)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        msg!("NFT sold with fee distribution of {} lamports", fee);
    } else {
        // If not past threshold, check if this transaction should trigger threshold
        if should_set_past_threshold(&ctx.accounts.pool, price) {
            ctx.accounts.pool.set_past_threshold(true);
            msg!("Pool has passed the threshold after NFT sale");
        }
    }
    
    msg!("NFT sold successfully for {} lamports", price);
    
    Ok(())
}

// Helper function to calculate NFT price
fn calculate_nft_price(nft_data: &crate::state::NFTData, pool: &BondingCurvePool) -> Result<u64> {
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
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
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
        .ok_or(crate::errors::ErrorCode::MathOverflow)?
        .checked_div(fee_denominator)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    Ok(fee)
}

// Helper function to determine if we should set past threshold
fn should_set_past_threshold(pool: &BondingCurvePool, transaction_amount: u64) -> bool {
    // Example threshold condition based on transaction amount and current state
    let new_market_cap = pool.current_market_cap.saturating_add(transaction_amount);
    new_market_cap > 1_000_000_000 && pool.total_supply > 1_000_000
}
