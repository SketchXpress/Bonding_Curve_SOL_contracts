use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::{BondingCurvePool};

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub real_token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"synthetic-mint", real_token_mint.key().as_ref()],
        bump,
        mint::decimals = real_token_mint.decimals,
        mint::authority = pool,
    )]
    pub synthetic_token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"token-vault", real_token_mint.key().as_ref()],
        bump,
        token::mint = real_token_mint,
        token::authority = pool,
    )]
    pub real_token_vault: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump,
        space = BondingCurvePool::SIZE,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    base_price: u64,
    growth_factor: u64,
) -> Result<()> {
    // Validate input parameters to prevent potential issues
    if base_price == 0 {
        return Err(error!(crate::errors::ErrorCode::InvalidPrice));
    }
    
    if growth_factor == 0 {
        return Err(error!(crate::errors::ErrorCode::InvalidPrice));
    }
    
    // Get a mutable reference to the pool account
    let pool = &mut ctx.accounts.pool;
    
    // Get the bump from the context
    let bump = ctx.bumps.pool;
    
    // Initialize pool fields with proper error handling
    pool.authority = ctx.accounts.authority.key();
    pool.real_token_mint = ctx.accounts.real_token_mint.key();
    pool.synthetic_token_mint = ctx.accounts.synthetic_token_mint.key();
    pool.real_token_vault = ctx.accounts.real_token_vault.key();
    
    // Initialize numeric fields with safe values
    pool.current_market_cap = 0;
    pool.base_price = base_price;
    pool.growth_factor = growth_factor;
    pool.total_supply = 0;
    pool.past_threshold = false;
    
    // Initialize price history array with zeros
    // Use a loop instead of direct assignment to avoid potential memory issues
    for i in 0..10 {
        pool.price_history[i] = 0;
    }
    
    pool.price_history_idx = 0;
    
    // Initialize the new fields we added for burn-distribute mechanism
    pool.total_burned = 0;
    pool.total_distributed = 0;
    
    // Initialize the new fields for Tensor migration
    pool.migrated_to_tensor = false;
    pool.tensor_migration_timestamp = 0;
    pool.bump = bump;
    
    // Log successful pool creation for debugging
    msg!("Pool created successfully with base_price: {} and growth_factor: {}", 
         base_price, growth_factor);
    
    Ok(())
}
