use anchor_lang::prelude::*;

use crate::state::BondingCurvePool;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreatePoolArgs {
    pub base_price: u64,
    pub growth_factor: u64,
}

#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: This is the collection mint for the NFTs
    pub collection_mint: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = creator,
        space = BondingCurvePool::SPACE,
        seeds = [b"bonding-curve-pool", collection_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_pool(
    ctx: Context<CreatePool>,
    args: CreatePoolArgs,
) -> Result<()> {
    let base_price = args.base_price;
    let growth_factor = args.growth_factor;
    // Initialize the pool
    let pool = &mut ctx.accounts.pool;
    
    // Set the collection ID
    pool.collection = ctx.accounts.collection_mint.key();
    
    // Set the base price (in lamports)
    pool.config.base_price = base_price;
    
    // Set the growth factor (fixed-point representation)
    pool.config.growth_factor = growth_factor;
    
    // Initialize current supply to 0
    pool.state.current_supply = 0;
    
    // Set protocol fee to 1% (10000 = 1%)
    pool.config.protocol_fee = 10000;
    
    // Set the creator
    pool.config.creator = ctx.accounts.creator.key();
    
    // Initialize total escrowed to 0
    pool.stats.total_escrowed = 0;
    
    // Set pool as active
        pool.state.is_active = true;
    
    // Store the bump
    pool.bump = ctx.bumps.pool;
    
    Ok(())
}
