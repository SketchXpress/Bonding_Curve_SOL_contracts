use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{BondingCurvePool, UserAccount};
use crate::math::bonding_curve::{calculate_price, is_past_threshold, calculate_platform_fee, calculate_escrow_amount};
use crate::constants::PLATFORM_FEE_PERCENTAGE;

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
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
        associated_token::authority = buyer,
    )]
    pub buyer_synthetic_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = pool.real_token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_real_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"user-account", buyer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub token_program: Program<'info, Token>,
}

pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let current_price = calculate_price(
        pool.current_market_cap,
        pool.base_price,
        pool.growth_factor,
    )?;
    
    // Calculate total cost in real tokens
    let total_cost = current_price
        .checked_mul(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Platform fee (2%)
    let platform_fee = calculate_platform_fee(total_cost, PLATFORM_FEE_PERCENTAGE)?;
    
    // Amount to escrow (98%)
    let escrow_amount = calculate_escrow_amount(total_cost, platform_fee)?;
    
    // Transfer real tokens from buyer to vault (98% of total)
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_real_token_account.to_account_info(),
                to: ctx.accounts.real_token_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        escrow_amount,
    )?;
    
    // Mint synthetic tokens to buyer
    let pool_seeds = &[
        b"bonding-pool", 
        pool.real_token_mint.as_ref(),
        &[pool.bump],
    ];
    let signer = &[&pool_seeds[..]];
    
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                to: ctx.accounts.buyer_synthetic_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;
    
    // Update market cap
    pool.current_market_cap = pool.current_market_cap
        .checked_add(total_cost)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Update total supply
    pool.total_supply = pool.total_supply
        .checked_add(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    // Update price history
    pool.price_history[pool.price_history_idx as usize] = current_price;
    pool.price_history_idx = (pool.price_history_idx + 1) % 10;
    
    // Check threshold
    if !pool.past_threshold && is_past_threshold(pool.current_market_cap) {
        pool.past_threshold = true;
    }
    
    // Update user account
    let user = &mut ctx.accounts.user_account;
    user.synthetic_sol_balance = user.synthetic_sol_balance
        .checked_add(amount)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    Ok(())
}
