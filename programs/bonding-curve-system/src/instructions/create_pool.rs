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
    // Remove the Box to avoid IDL mismatch issues
    pub pool: Account<'info, BondingCurvePool>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

// Split the function into smaller parts to reduce stack usage
#[inline(never)]
pub fn create_pool(
    ctx: Context<CreatePool>,
    base_price: u64,
    growth_factor: u64,
) -> Result<()> {
    // Validate input parameters
    require!(base_price > 0, crate::errors::ErrorCode::InvalidPrice);
    require!(growth_factor > 0, crate::errors::ErrorCode::InvalidPrice);
    
    // Initialize account references
    initialize_pool_references(
        &mut ctx.accounts.pool,
        ctx.accounts.authority.key(),
        ctx.accounts.real_token_mint.key(),
        ctx.accounts.synthetic_token_mint.key(),
        ctx.accounts.real_token_vault.key(),
    );
    
    // Initialize numeric values
    initialize_pool_values(
        &mut ctx.accounts.pool,
        base_price,
        growth_factor,
        ctx.bumps.pool,
    );
    
    // Log successful pool creation
    msg!("Pool created successfully with base_price: {} and growth_factor: {}", 
         base_price, growth_factor);
    
    Ok(())
}

// Helper function to initialize account references
#[inline(never)]
fn initialize_pool_references(
    pool: &mut BondingCurvePool,
    authority: Pubkey,
    real_token_mint: Pubkey,
    synthetic_token_mint: Pubkey,
    real_token_vault: Pubkey,
) {
    pool.authority = authority;
    pool.real_token_mint = real_token_mint;
    pool.synthetic_token_mint = synthetic_token_mint;
    pool.real_token_vault = real_token_vault;
}

// Helper function to initialize numeric values
#[inline(never)]
fn initialize_pool_values(
    pool: &mut BondingCurvePool,
    base_price: u64,
    growth_factor: u64,
    bump: u8,
) {
    // Initialize numeric fields
    pool.current_market_cap = 0;
    pool.base_price = base_price;
    pool.growth_factor = growth_factor;
    pool.total_supply = 0;
    
    // Initialize boolean fields
    pool.past_threshold = false;
    
    // Initialize arrays directly
    pool._padding1 = [0; 7];
    pool.price_history = [0; 10];
    pool.price_history_idx = 0;
    pool._padding2 = [0; 7];
    
    // Initialize burn-distribute fields
    pool.total_burned = 0;
    pool.total_distributed = 0;
    
    // Initialize Tensor migration fields
    pool.migrated_to_tensor = false;
    pool._padding3 = [0; 7];
    pool.tensor_migration_timestamp = 0;
    
    // Store the bump
    pool.bump = bump;
    pool._padding4 = [0; 7];
}
