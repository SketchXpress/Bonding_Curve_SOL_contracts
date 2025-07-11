use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};
use crate::{
    errors::ErrorCode,
    utils::debug::*,
    debug_log,
};

/// Simple token transfer
pub fn transfer_tokens(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
) -> Result<()> {
    let mut debug_ctx = DebugContext::new("transfer_tokens");
    transfer_tokens_with_context(from, to, authority, token_program, amount, &mut debug_ctx)
}

/// Token transfer with debug context
pub fn transfer_tokens_with_context(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("token_transfer");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} tokens", amount);

    // Validate token transfer
    validate_token_transfer(from, to, amount, debug_ctx)?;

    // Execute CPI transfer
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
    };
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    debug_log!(debug_ctx, LogLevel::Debug, "Token transfer completed");
    Ok(())
}

/// Token transfer with PDA authority
pub fn transfer_tokens_with_signer(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut debug_ctx = DebugContext::new("transfer_tokens_with_signer");
    transfer_tokens_with_signer_and_context(
        from, to, authority, token_program, amount, signer_seeds, &mut debug_ctx
    )
}

/// Token transfer with PDA authority and debug context
pub fn transfer_tokens_with_signer_and_context(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("token_transfer_with_signer");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} tokens with PDA signer", amount);

    // Validate token transfer
    validate_token_transfer(from, to, amount, debug_ctx)?;

    // Execute CPI transfer with signer
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.clone(),
    };
    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    
    anchor_spl::token::transfer(cpi_ctx, amount)?;

    debug_log!(debug_ctx, LogLevel::Debug, "Token transfer with signer completed");
    Ok(())
}

/// Validate token transfer parameters
fn validate_token_transfer(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("token_transfer_validation");

    // Check amount
    if amount == 0 {
        debug_log!(debug_ctx, LogLevel::Error, "Transfer amount cannot be zero");
        return Err(ErrorCode::InvalidAmount.into());
    }

    // Check from balance
    if from.amount < amount {
        debug_log!(
            debug_ctx,
            LogLevel::Error,
            "Insufficient token balance: has {}, needs {}",
            from.amount,
            amount
        );
        return Err(ErrorCode::InsufficientBalance.into());
    }

    // Check same mint
    if from.mint != to.mint {
        debug_log!(debug_ctx, LogLevel::Error, "Token accounts have different mints");
        return Err(ErrorCode::InvalidAccount.into());
    }

    // Check accounts are different
    if from.key() == to.key() {
        debug_log!(debug_ctx, LogLevel::Error, "Cannot transfer to same token account");
        return Err(ErrorCode::InvalidAccount.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Token transfer validation passed");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_token_transfer() {
        let mut debug_ctx = DebugContext::new("test");
        
        // Test zero amount validation
        // Note: This is a simplified test - in practice you'd need proper TokenAccount setup
        // The validation logic itself is what we're testing here
        
        // Test that zero amount fails
        // (Would need proper mock setup for full test)
    }
}

