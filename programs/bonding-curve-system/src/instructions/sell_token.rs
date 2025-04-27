use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn};
use crate::state::{BondingCurvePool, BondingCurvePoolAccount};

#[derive(Accounts)]
pub struct SellToken<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(mut)]
    pub user_account: Account<'info, crate::state::UserAccount>,
    
    #[account(mut)]
    pub pool: AccountLoader<'info, BondingCurvePool>,
    
    pub real_token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"synthetic-mint", real_token_mint.key().as_ref()],
        bump,
    )]
    pub synthetic_token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token-vault", real_token_mint.key().as_ref()],
        bump,
    )]
    pub real_token_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller_synthetic_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_token(ctx: Context<SellToken>, amount: u64) -> Result<()> {
    // Validate input
    require!(amount > 0, crate::errors::ErrorCode::InvalidAmount);
    
    // Load pool data using zero-copy approach
    let mut pool = ctx.accounts.pool.load_mut()?;
    
    // Check if pool has passed threshold using the flags API
    if pool.is_past_threshold() {
        // Calculate the amount of tokens to burn
        let burn_amount = calculate_burn_amount(amount, &pool)?;
        
        // Burn synthetic tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                    from: ctx.accounts.seller_synthetic_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        // Update pool state
        pool.total_supply = pool.total_supply.checked_sub(burn_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Update total burned amount
        pool.total_burned = pool.total_burned.checked_add(burn_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Calculate the amount of real tokens to transfer
        let transfer_amount = calculate_transfer_amount(amount, &pool)?;
        
        // Transfer real tokens from vault to seller
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.real_token_vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[&[
                    b"bonding-pool",
                    ctx.accounts.real_token_mint.key().as_ref(),
                    &[pool.bump],
                ]],
            ),
            transfer_amount,
        )?;
        
        // Update total distributed amount
        pool.total_distributed = pool.total_distributed.checked_add(transfer_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Update market cap
        pool.current_market_cap = pool.current_market_cap.checked_sub(transfer_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Log the transaction
        msg!("Sold {} synthetic tokens for {} real tokens", burn_amount, transfer_amount);
    } else {
        // If threshold not passed, use standard bonding curve logic
        
        // Calculate the amount of tokens to burn
        let burn_amount = amount;
        
        // Burn synthetic tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                    from: ctx.accounts.seller_synthetic_token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            burn_amount,
        )?;
        
        // Update pool state
        pool.total_supply = pool.total_supply.checked_sub(burn_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Calculate the amount of real tokens to transfer based on bonding curve
        let transfer_amount = calculate_bonding_curve_output(burn_amount, &pool)?;
        
        // Transfer real tokens from vault to seller
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.real_token_vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[&[
                    b"bonding-pool",
                    ctx.accounts.real_token_mint.key().as_ref(),
                    &[pool.bump],
                ]],
            ),
            transfer_amount,
        )?;
        
        // Update market cap
        pool.current_market_cap = pool.current_market_cap.checked_sub(transfer_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Check if we should set past threshold flag
        if should_set_past_threshold(&pool) {
            // Use the setter method from the flags API
            pool.set_past_threshold(true);
            msg!("Pool has passed the threshold");
        }
        
        // Log the transaction
        msg!("Sold {} synthetic tokens for {} real tokens using bonding curve", burn_amount, transfer_amount);
    }
    
    Ok(())
}

// Helper function to calculate burn amount
fn calculate_burn_amount(amount: u64, _pool: &BondingCurvePool) -> Result<u64> {
    // Simple implementation - in a real scenario this might be more complex
    Ok(amount)
}

// Helper function to calculate transfer amount
fn calculate_transfer_amount(amount: u64, pool: &BondingCurvePool) -> Result<u64> {
    // Simple implementation - in a real scenario this might be more complex
    let base_amount = amount.checked_mul(pool.base_price)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    Ok(base_amount.checked_div(1_000_000).unwrap_or(0))
}

// Helper function to calculate bonding curve output
fn calculate_bonding_curve_output(amount: u64, pool: &BondingCurvePool) -> Result<u64> {
    // Simple implementation of a bonding curve formula
    // In a real scenario, this would implement the actual bonding curve math
    let base_amount = amount.checked_mul(pool.base_price)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    let growth_factor = pool.growth_factor.checked_div(1_000_000).unwrap_or(1);
    let supply_factor = pool.total_supply.checked_div(1_000_000).unwrap_or(1);
    
    let bonus = growth_factor.checked_mul(supply_factor).unwrap_or(0);
    
    let total = base_amount.checked_add(bonus).unwrap_or(base_amount);
    
    Ok(total.checked_div(1_000_000).unwrap_or(0))
}

// Helper function to determine if we should set past threshold
fn should_set_past_threshold(pool: &BondingCurvePool) -> bool {
    // Example threshold condition - in a real scenario this would be based on specific requirements
    pool.current_market_cap > 1_000_000_000 && pool.total_supply > 1_000_000
}
