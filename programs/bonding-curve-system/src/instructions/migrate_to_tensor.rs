use anchor_lang::prelude::*;
use crate::state::BondingCurvePool;

#[derive(Accounts)]
pub struct MigrateToTensor<
    'info
> {
    #[account(mut)]
    pub authority: Signer<
        'info
    >,
    
    #[account(
        mut,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump = pool.bump, // Use pool.bump directly
    )]
    pub pool: Account<
        'info,
        BondingCurvePool
    >, // Changed from AccountLoader to Account
    
    pub real_token_mint: Account<
        'info,
        anchor_spl::token::Mint
    >,
    
    pub system_program: Program<
        'info,
        System
    >,
}

pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
    // Access pool data directly
    let pool = &mut ctx.accounts.pool;
    
    // Verify authority
    require!(
        pool.authority == ctx.accounts.authority.key(),
        crate::errors::ErrorCode::InvalidAuthority
    );
    
    // Verify not already migrated
    require!(
        !pool.is_migrated_to_tensor(),
        crate::errors::ErrorCode::InvalidPool
    );
    
    // Set migration flag
    pool.set_migrated_to_tensor(true);
    
    // Set migration timestamp
    pool.tensor_migration_timestamp = Clock::get()?.unix_timestamp;
    
    // Log migration
    msg!("Pool migrated to Tensor at timestamp: {}", pool.tensor_migration_timestamp);
    
    Ok(())
}
