use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, MintTo};
use crate::state::BondingCurvePool;

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
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
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer_synthetic_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
    // Validate input
    require!(amount > 0, crate::errors::ErrorCode::InvalidAmount);
    
    // Load pool data using zero-copy approach
    let mut pool = ctx.accounts.pool.load_mut()?;
    
    // Check if pool has passed threshold using the new flags API
    if pool.is_past_threshold() {
        // Calculate the amount of tokens to mint
        let mint_amount = calculate_mint_amount(amount, &pool)?;
        
        // Transfer real tokens from buyer to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.real_token_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;
        
        // Mint synthetic tokens to buyer
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                    to: ctx.accounts.buyer_synthetic_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[&[
                    b"bonding-pool",
                    ctx.accounts.real_token_mint.key().as_ref(),
                    &[pool.bump],
                ]],
            ),
            mint_amount,
        )?;
        
        // Update pool state
        pool.total_supply = pool.total_supply.checked_add(mint_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Update market cap
        pool.current_market_cap = pool.current_market_cap.checked_add(amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Log the transaction
        msg!("Bought {} synthetic tokens for {} real tokens", mint_amount, amount);
    } else {
        // If threshold not passed, use standard bonding curve logic
        
        // Calculate the amount of tokens to mint based on bonding curve
        let mint_amount = calculate_bonding_curve_output(amount, &pool)?;
        
        // Transfer real tokens from buyer to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.real_token_vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )?;
        
        // Mint synthetic tokens to buyer
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.synthetic_token_mint.to_account_info(),
                    to: ctx.accounts.buyer_synthetic_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                &[&[
                    b"bonding-pool",
                    ctx.accounts.real_token_mint.key().as_ref(),
                    &[pool.bump],
                ]],
            ),
            mint_amount,
        )?;
        
        // Update pool state
        pool.total_supply = pool.total_supply.checked_add(mint_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Update market cap
        pool.current_market_cap = pool.current_market_cap.checked_add(amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        // Update price history
        update_price_history(&mut pool, amount, mint_amount)?;
        
        // Check if we should set past threshold flag
        if should_set_past_threshold(&pool) {
            // Use the setter method from the flags API
            pool.set_past_threshold(true);
            msg!("Pool has passed the threshold");
        }
        
        // Log the transaction
        msg!("Bought {} synthetic tokens for {} real tokens using bonding curve", mint_amount, amount);
    }
    
    Ok(())
}

// Helper function to calculate mint amount
fn calculate_mint_amount(amount: u64, pool: &BondingCurvePool) -> Result<u64> {
    // Simple implementation - in a real scenario this might be more complex
    let base_amount = amount.checked_mul(1_000_000)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    Ok(base_amount.checked_div(pool.base_price).unwrap_or(0))
}

// Helper function to calculate bonding curve output
fn calculate_bonding_curve_output(amount: u64, pool: &BondingCurvePool) -> Result<u64> {
    // Simple implementation of a bonding curve formula
    // In a real scenario, this would implement the actual bonding curve math
    let base_amount = amount.checked_mul(1_000_000)
        .ok_or(crate::errors::ErrorCode::MathOverflow)?;
    
    let base_output = base_amount.checked_div(pool.base_price).unwrap_or(0);
    
    // Apply growth factor discount as supply increases
    let growth_factor = pool.growth_factor.checked_div(1_000_000).unwrap_or(1);
    let supply_factor = pool.total_supply.checked_div(1_000_000).unwrap_or(1);
    
    let discount = growth_factor.checked_mul(supply_factor).unwrap_or(0);
    
    // Ensure discount doesn't exceed base output
    let discount = std::cmp::min(discount, base_output.checked_div(2).unwrap_or(0));
    
    let final_output = base_output.checked_sub(discount).unwrap_or(base_output);
    
    Ok(final_output)
}

// Helper function to update price history
fn update_price_history(pool: &mut BondingCurvePool, amount: u64, mint_amount: u64) -> Result<()> {
    // Calculate price (real tokens per synthetic token)
    let price = if mint_amount > 0 {
        amount.checked_mul(1_000_000).unwrap_or(amount) / mint_amount
    } else {
        pool.base_price
    };
    
    // Store price in history
    pool.price_history_idx = (pool.price_history_idx as usize + 1) as u8;
    
    // Log the price update
    msg!("Updated price history: {} at index {}", price, pool.price_history_idx);
    
    Ok(())
}

// Helper function to determine if we should set past threshold
fn should_set_past_threshold(pool: &BondingCurvePool) -> bool {
    // Example threshold condition - in a real scenario this would be based on specific requirements
    pool.current_market_cap > 1_000_000_000 && pool.total_supply > 1_000_000
}
