use crate::errors::ErrorCode;
use crate::state::BondingCurvePool;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MigrateToTensor<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bonding-curve-pool", collection_mint.key().as_ref()],
        bump = pool.bump,
        constraint = pool.creator == authority.key() @ ErrorCode::InvalidAuthority
    )]
    pub pool: Account<'info, BondingCurvePool>,

    /// CHECK: This is the collection mint used for pool PDA derivation
    pub collection_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
    // Access pool data directly
    let pool = &mut ctx.accounts.pool;

    // Verify not already migrated
    require!(
        !pool.is_migrated_to_tensor,
        ErrorCode::AlreadyMigrated // Use existing error code if applicable
    );

    // Check liquidity threshold (690 SOL = 69,0 * 1,000,000,000 lamports)
    const MIGRATION_THRESHOLD: u64 = 690_000_000_000;
    require!(
        pool.total_escrowed >= MIGRATION_THRESHOLD,
        ErrorCode::ThresholdNotMet
    );

    // Freeze pool
    pool.is_active = false;

    // Set migration flag
    pool.is_migrated_to_tensor = true;

    // Set migration timestamp
    pool.tensor_migration_timestamp = Clock::get()?.unix_timestamp;

    // TODO: Implement actual Tensor pool initialization CPI
    // This requires the Tensor program interface (ABI/IDL) and program ID.
    msg!("Placeholder: Tensor pool initialization CPI would be called here.");

    // Log migration
    msg!(
        "Pool migrated to Tensor at timestamp: {}",
        pool.tensor_migration_timestamp
    );

    Ok(())
}
