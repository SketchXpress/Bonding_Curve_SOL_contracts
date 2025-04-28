use anchor_lang::prelude::*;
use crate::state::BondingCurvePool;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct MigrateToTensor<
    // No lifetime needed here as we are using Account<'info, ...>
    // which handles lifetimes implicitly.
    // <'info>
> {
    #[account(mut)]
    pub authority: Signer<
        // No lifetime needed here
        // <'info>
    >,
    
    #[account(
        mut,
        // The seeds in the document are [b"bonding-curve-pool", collection_mint.key().as_ref()]
        // The seeds here are [b"bonding-pool", real_token_mint.key().as_ref()]
        // Assuming the original seeds for the pool are correct, let's use those.
        // We need the collection_mint account to derive the pool PDA.
        // seeds = [b"bonding-pool", real_token_mint.key().as_ref()],
        seeds = [b"bonding-curve-pool", collection_mint.key().as_ref()],
        bump = pool.bump, // Use pool.bump directly
        // Constraint to check authority matches the pool's creator/authority field
        constraint = pool.creator == authority.key() @ ErrorCode::InvalidAuthority
    )]
    pub pool: Account<
        // No lifetime needed here
        // <'info>,
        BondingCurvePool
    >, 
    
    // This account is needed for the pool PDA derivation
    /// CHECK: This is the collection mint used for pool PDA derivation
    pub collection_mint: UncheckedAccount<
        // No lifetime needed here
        // <'info>
    >,
    
    // Remove real_token_mint as it's not used in the logic or seeds
    // pub real_token_mint: Account<
    //     'info,
    //     anchor_spl::token::Mint
    // >,
    
    pub system_program: Program<
        // No lifetime needed here
        // <'info>,
        System
    >,
}

pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
    // Access pool data directly
    let pool = &mut ctx.accounts.pool;
    
    // Authority check is handled by the constraint in #[account(...)]
    // require!(
    //     pool.creator == ctx.accounts.authority.key(), // Assuming creator is the authority
    //     ErrorCode::InvalidAuthority
    // );
    
    // Verify not already migrated
    require!(
        !pool.is_migrated_to_tensor, // Access field directly
        ErrorCode::AlreadyMigrated // Use existing error code if applicable
    );

    // Check liquidity threshold (69k SOL = 69,000 * 1,000,000,000 lamports)
    const MIGRATION_THRESHOLD: u64 = 69_000_000_000_000;
    require!(
        pool.total_escrowed >= MIGRATION_THRESHOLD,
        ErrorCode::ThresholdNotMet
    );
    
    // Freeze pool
    pool.is_active = false;

    // Set migration flag
    pool.is_migrated_to_tensor = true; // Set field directly
    
    // Set migration timestamp
    pool.tensor_migration_timestamp = Clock::get()?.unix_timestamp;
    
    // TODO: Implement actual Tensor pool initialization CPI
    // This requires the Tensor program interface (ABI/IDL) and program ID.
    // Example placeholder:
    // tensor::cpi::create_pool(
    //     ctx.accounts.tensor_program.to_account_info(),
    //     tensor::cpi::accounts::CreatePool {
    //         payer: ctx.accounts.authority.to_account_info(),
    //         tensor_pool: ctx.accounts.tensor_pool.to_account_info(), // Need Tensor pool account
    //         collection_mint: ctx.accounts.collection_mint.to_account_info(),
    //         system_program: ctx.accounts.system_program.to_account_info(),
    //     },
    //     pool.total_escrowed, // Pass initial liquidity
    // )?;
    msg!("Placeholder: Tensor pool initialization CPI would be called here.");

    // Log migration
    msg!("Pool migrated to Tensor at timestamp: {}", pool.tensor_migration_timestamp);
    
    Ok(())
}
