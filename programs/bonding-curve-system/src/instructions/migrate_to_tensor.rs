use anchor_lang::prelude::*;
use crate::state::BondingCurvePool;
use crate::constants::THRESHOLD_MARKET_CAP;

#[derive(Accounts)]
pub struct MigrateToTensor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        bump = pool.bump,
        constraint = pool.authority == authority.key(),
        constraint = pool.past_threshold == true,
        constraint = pool.migrated_to_tensor == false,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub real_token_mint: Account<'info, anchor_spl::token::Mint>,
    
    pub system_program: Program<'info, System>,
}

pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
    // Verify that the market cap is above the threshold
    require!(
        ctx.accounts.pool.current_market_cap >= THRESHOLD_MARKET_CAP,
        crate::errors::ErrorCode::BelowThreshold
    );
    
    // Get a mutable reference to the pool
    let pool = &mut ctx.accounts.pool;
    
    // Update migration status
    pool.migrated_to_tensor = true;
    pool.tensor_migration_timestamp = Clock::get()?.unix_timestamp;
    
    // Log the migration
    msg!("Collection successfully migrated to Tensor marketplace");
    msg!("Market cap at migration: {} SOL", pool.current_market_cap);
    msg!("Migration timestamp: {}", pool.tensor_migration_timestamp);
    
    Ok(())
}
