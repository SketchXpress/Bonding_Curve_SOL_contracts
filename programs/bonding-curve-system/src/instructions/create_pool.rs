use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::BondingCurvePool;

#[derive(Accounts)]
#[instruction(base_price: u64, growth_factor: u64)]
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
        mint::authority = pool.key(),
    )]
    pub synthetic_token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"token-vault", real_token_mint.key().as_ref()],
        bump,
        token::mint = real_token_mint,
        token::authority = pool.key(),
    )]
    pub real_token_vault: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<BondingCurvePool>(),
    )]
    pub pool: AccountLoader<'info, BondingCurvePool>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    base_price: u64,
    growth_factor: u64,
) -> Result<()> {
    // Validate input parameters
    require!(base_price > 0, crate::errors::ErrorCode::InvalidPrice);
    require!(growth_factor > 0, crate::errors::ErrorCode::InvalidPrice);
    
    // Initialize the pool by loading it
    let mut pool = ctx.accounts.pool.load_init()?;
    
    // Store only the public keys of accounts, not the accounts themselves
    pool.authority = ctx.accounts.authority.key();
    pool.real_token_mint = ctx.accounts.real_token_mint.key();
    pool.synthetic_token_mint = ctx.accounts.synthetic_token_mint.key();
    pool.real_token_vault = ctx.accounts.real_token_vault.key();
    
    // Initialize numeric fields
    pool.current_market_cap = 0;
    pool.base_price = base_price;
    pool.growth_factor = growth_factor;
    pool.total_supply = 0;
    
    // Initialize flags and other fields
    pool.flags = 0;
    pool.price_history_idx = 0;
    pool.bump = ctx.bumps.pool;
    
    // Initialize reserved array
    pool._reserved = [0; 5];
    
    // Initialize remaining fields
    pool.total_burned = 0;
    pool.total_distributed = 0;
    pool.tensor_migration_timestamp = 0;
    
    // Log successful pool creation
    msg!("Pool created successfully with base_price: {} and growth_factor: {}", 
         base_price, growth_factor);
    
    Ok(())
}
