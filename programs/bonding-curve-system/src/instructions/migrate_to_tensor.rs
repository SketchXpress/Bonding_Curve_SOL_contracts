use anchor_lang::prelude::*;
use crate::state::{BondingCurvePool};

#[derive(Accounts)]
pub struct MigrateToTensor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ crate::errors::ErrorCode::InvalidAuthority,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub real_token_mint: Account<'info, anchor_spl::token::Mint>,
    
    pub system_program: Program<'info, System>,
}

pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
    // Check if already migrated using the new flags API
    require!(!ctx.accounts.pool.is_migrated_to_tensor(), crate::errors::ErrorCode::InvalidPool);
    
    // Verify authority
    require!(
        ctx.accounts.pool.authority == ctx.accounts.authority.key(),
        crate::errors::ErrorCode::InvalidAuthority
    );
    
    // Verify pool is past threshold
    require!(
        ctx.accounts.pool.is_past_threshold(),
        crate::errors::ErrorCode::BelowThreshold
    );
    
    // Set migration flag using the new flags API
    ctx.accounts.pool.set_migrated_to_tensor(true);
    
    // Record migration timestamp
    ctx.accounts.pool.tensor_migration_timestamp = Clock::get()?.unix_timestamp;
    
    // Log migration details
    msg!(
        "Pool migrated to Tensor successfully at timestamp: {}",
        ctx.accounts.pool.tensor_migration_timestamp
    );
    
    // Additional migration logic could be added here
    // For example, transferring ownership, updating permissions, etc.
    
    // Emit an event for off-chain tracking
    emit!(MigrationEvent {
        pool: ctx.accounts.pool.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: ctx.accounts.pool.tensor_migration_timestamp,
        market_cap: ctx.accounts.pool.current_market_cap,
        total_supply: ctx.accounts.pool.total_supply,
        total_burned: ctx.accounts.pool.total_burned,
        total_distributed: ctx.accounts.pool.total_distributed,
    });
    
    Ok(())
}

// Event emitted when a pool is migrated to Tensor
#[event]
pub struct MigrationEvent {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
    pub market_cap: u64,
    pub total_supply: u64,
    pub total_burned: u64,
    pub total_distributed: u64,
}
