use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{BondingCurvePool, UserAccount};
use crate::math::bonding_curve::BondingCurve;

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user-account", buyer.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub real_token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"synthetic-mint", real_token_mint.key().as_ref()],
        bump,
    )]
    pub synthetic_token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token-vault", real_token_mint.key().as_ref()],
        bump,
    )]
    pub real_token_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == real_token_mint.key(),
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = buyer_synthetic_token_account.owner == buyer.key(),
        constraint = buyer_synthetic_token_account.mint == synthetic_token_mint.key(),
    )]
    pub buyer_synthetic_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let user = &mut ctx.accounts.user_account;
    
    // Create bonding curve instance
    let bonding_curve = BondingCurve {
        base_price: pool.base_price,
        growth_factor: pool.growth_factor,
    };
    
    // Calculate cost to buy tokens
    let total_cost = bonding_curve.calculate_buy_cost(pool.current_market_cap, amount)?;
    
    // Calculate platform fee
    let platform_fee = bonding_curve.calculate_platform_fee(total_cost)?;
    
    // Calculate net cost (total - fee)
    let net_cost = bonding_curve.calculate_net_cost(total_cost)?;
    
    // Transfer tokens from buyer to pool
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.real_token_vault.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        total_cost,
    )?;
    
    // Mint synthetic tokens to buyer
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                to: ctx.accounts.buyer_synthetic_token_account.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            &[&[
                b"bonding-pool",
                ctx.accounts.real_token_mint.key().as_ref(),
                &[pool.bump],
            ]],
        ),
        amount,
    )?;
    
    // Update pool state
    pool.current_market_cap = pool.current_market_cap.checked_add(amount).unwrap();
    pool.total_supply = pool.total_supply.checked_add(amount).unwrap();
    
    // Check if we've crossed the threshold
    let past_threshold = bonding_curve.is_past_threshold(pool.current_market_cap);
    if past_threshold && !pool.past_threshold {
        pool.past_threshold = true;
        // Special event could be triggered here
    }
    
    // Update price history
    let current_price = bonding_curve.calculate_price(pool.current_market_cap)?;
    pool.price_history[pool.price_history_idx as usize] = current_price;
    pool.price_history_idx = (pool.price_history_idx + 1) % 10;
    
    // Update user state
    user.synthetic_sol_balance = user.synthetic_sol_balance.checked_add(amount).unwrap();
    user.real_sol_balance = user.real_sol_balance.checked_add(platform_fee).unwrap();
    
    Ok(())
}
