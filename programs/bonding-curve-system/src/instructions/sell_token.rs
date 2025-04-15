use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn};
use crate::state::{BondingCurvePool, UserAccount};
use crate::math::bonding_curve::{calculate_price, calculate_platform_fee, calculate_escrow_amount};
use crate::constants::PLATFORM_FEE_PERCENTAGE;

#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding-pool", pool.real_token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    #[account(
        mut,
        constraint = real_token_vault.mint == pool.real_token_mint,
        constraint = real_token_vault.owner == pool.key(),
    )]
    pub real_token_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = synthetic_token_mint.key() == pool.synthetic_token_mint,
    )]
    pub synthetic_token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = synthetic_token_mint,
        associated_token::authority = seller,
    )]
    pub seller_synthetic_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = pool.real_token_mint,
        associated_token::authority = seller,
    )]
    pub seller_real_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"user-account", seller.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn sell_token(ctx: Context<SellToken>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    
    // Ensure user has enough synthetic tokens
    require!(
        ctx.accounts.seller_synthetic_token_account.amount >= amount,
        crate::errors::ErrorCode::InsufficientFunds
    );
    
    // Calculate current price
    let current_price = calculate_price(
        pool.current_market_cap,
        pool.base_price,
        pool.growth_factor,
    )?;
    
    // Calculate total payout in real tokens
    let total_payout = current_price
        .checked_mul(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Platform fee (2%)
    let platform_fee = calculate_platform_fee(total_payout, PLATFORM_FEE_PERCENTAGE)?;
    
    // Amount to transfer to seller (98%)
    let transfer_amount = calculate_escrow_amount(total_payout, platform_fee)?;
    
    // Ensure pool has enough real tokens
    require!(
        ctx.accounts.real_token_vault.amount >= transfer_amount,
        crate::errors::ErrorCode::InsufficientFunds
    );
    
    // Burn synthetic tokens from seller
    let pool_seeds = &[
        b"bonding-pool", 
        pool.real_token_mint.as_ref(),
        &[pool.bump],
    ];
    let signer = &[&pool_seeds[..]];
    
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                from: ctx.accounts.seller_synthetic_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        amount,
    )?;
    
    // Transfer real tokens from vault to seller
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.real_token_vault.to_account_info(),
                to: ctx.accounts.seller_real_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        ),
        transfer_amount,
    )?;
    
    // Update market cap
    pool.current_market_cap = pool.current_market_cap
        .checked_sub(total_payout)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Update total supply
    pool.total_supply = pool.total_supply
        .checked_sub(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Update price history
    pool.price_history[pool.price_history_idx as usize] = current_price;
    pool.price_history_idx = (pool.price_history_idx + 1) % 10;
    
    // Update user account
    let user = &mut ctx.accounts.user_account;
    user.synthetic_sol_balance = user.synthetic_sol_balance
        .checked_sub(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    Ok(())
}
