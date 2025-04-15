use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint};
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
    let pool = &mut ctx.accounts.pool;
    let bump = *ctx.bumps.get("pool").unwrap();
    
    pool.authority = ctx.accounts.authority.key();
    pool.real_token_mint = ctx.accounts.real_token_mint.key();
    pool.synthetic_token_mint = ctx.accounts.synthetic_token_mint.key();
    pool.real_token_vault = ctx.accounts.real_token_vault.key();
    pool.current_market_cap = 0;
    pool.base_price = base_price;
    pool.growth_factor = growth_factor;
    pool.total_supply = 0;
    pool.past_threshold = false;
    pool.price_history = [0; 10];
    pool.price_history_idx = 0;
    pool.bump = bump;
    
    Ok(())
}
