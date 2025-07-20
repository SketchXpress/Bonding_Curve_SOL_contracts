use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    utils::debug::*,
    debug_log,
};

/// Simple SOL transfer with debug logging
pub fn transfer_sol(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("sol_transfer");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} lamports", amount);

    // Validate accounts
    validate_transfer_accounts(from, to, amount, debug_ctx)?;

    // Execute transfer
    **from.try_borrow_mut_lamports()? = from.lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientBalance)?;

    **to.try_borrow_mut_lamports()? = to.lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    debug_log!(debug_ctx, LogLevel::Debug, "SOL transfer completed");
    Ok(())
}

/// Simple token transfer with debug logging
pub fn transfer_tokens(
    from: &Account<TokenAccount>,
    to: &Account<TokenAccount>,
    authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("token_transfer");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} tokens", amount);

    // Validate token accounts
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

/// Transfer tokens with PDA authority
pub fn transfer_tokens_with_signer(
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

    // Validate token accounts
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

/// Transfer SOL to escrow account
pub fn transfer_sol_to_escrow(
    from_token_account: &Account<TokenAccount>,
    to_escrow: &Account<TokenAccount>,
    authority: &Signer,
    token_program: &Program<Token>,
    amount: u64,
) -> Result<()> {
    let mut debug_ctx = DebugContext::new("transfer_sol_to_escrow");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} SOL to escrow", amount);

    // Validate escrow transfer
    if from_token_account.amount < amount {
        debug_log!(debug_ctx, LogLevel::Error, "Insufficient balance for escrow");
        return Err(ErrorCode::InsufficientBalance.into());
    }

    // Execute transfer
    transfer_tokens(
        from_token_account,
        to_escrow,
        &authority.to_account_info(),
        token_program,
        amount,
        &mut debug_ctx,
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "SOL escrow transfer completed");
    Ok(())
}

/// Refund SOL from escrow
pub fn refund_sol_from_escrow(
    from_escrow: &Account<TokenAccount>,
    to_token_account: &Account<TokenAccount>,
    escrow_authority: &AccountInfo,
    token_program: &Program<Token>,
    amount: u64,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut debug_ctx = DebugContext::new("refund_sol_from_escrow");
    debug_log!(debug_ctx, LogLevel::Debug, "Refunding {} SOL from escrow", amount);

    // Validate refund
    if from_escrow.amount < amount {
        debug_log!(debug_ctx, LogLevel::Error, "Insufficient escrow balance for refund");
        return Err(ErrorCode::InsufficientBalance.into());
    }

    // Execute refund
    transfer_tokens_with_signer(
        from_escrow,
        to_token_account,
        escrow_authority,
        token_program,
        amount,
        signer_seeds,
        &mut debug_ctx,
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "SOL escrow refund completed");
    Ok(())
}

// === VALIDATION HELPERS ===

fn validate_transfer_accounts(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("transfer_validation");

    // Check amount
    if amount == 0 {
        debug_log!(debug_ctx, LogLevel::Error, "Transfer amount cannot be zero");
        return Err(ErrorCode::InvalidAmount.into());
    }

    // Check from balance
    if from.lamports() < amount {
        debug_log!(
            debug_ctx,
            LogLevel::Error,
            "Insufficient balance: has {}, needs {}",
            from.lamports(),
            amount
        );
        return Err(ErrorCode::InsufficientBalance.into());
    }

    // Check accounts are different
    if from.key() == to.key() {
        debug_log!(debug_ctx, LogLevel::Error, "Cannot transfer to same account");
        return Err(ErrorCode::InvalidAccount.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Transfer validation passed");
    Ok(())
}

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

// === UTILITY FUNCTIONS ===

/// Calculate transfer fee (if any)
pub fn calculate_transfer_fee(amount: u64, fee_bp: u16) -> Result<u64> {
    amount
        .checked_mul(fee_bp as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10000)
        .ok_or(ErrorCode::MathUnderflow.into())
}

/// Split amount into multiple parts
pub fn split_amount(total: u64, percentages: &[u16]) -> Result<Vec<u64>> {
    let mut amounts = Vec::new();
    let mut remaining = total;

    // Validate percentages sum to 100%
    let sum: u16 = percentages.iter().sum();
    if sum != 10000 {
        return Err(ErrorCode::InvalidAmount.into());
    }

    // Calculate each amount
    for (i, &percentage) in percentages.iter().enumerate() {
        let amount = if i == percentages.len() - 1 {
            // Last amount gets remaining to avoid rounding errors
            remaining
        } else {
            total
                .checked_mul(percentage as u64)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(10000)
                .ok_or(ErrorCode::MathUnderflow)?
        };

        amounts.push(amount);
        remaining = remaining.checked_sub(amount).ok_or(ErrorCode::MathUnderflow)?;
    }

    Ok(amounts)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_transfer_fee() {
        // Test 1% fee on 1 SOL
        let fee = calculate_transfer_fee(1_000_000_000, 100).unwrap();
        assert_eq!(fee, 10_000_000); // 0.01 SOL

        // Test 0.5% fee on 2 SOL
        let fee = calculate_transfer_fee(2_000_000_000, 50).unwrap();
        assert_eq!(fee, 10_000_000); // 0.01 SOL
    }

    #[test]
    fn test_split_amount() {
        // Test 95%/4%/1% split
        let amounts = split_amount(1_000_000_000, &[9500, 400, 100]).unwrap();
        assert_eq!(amounts.len(), 3);
        assert_eq!(amounts[0], 950_000_000); // 95%
        assert_eq!(amounts[1], 40_000_000);  // 4%
        assert_eq!(amounts[2], 10_000_000);  // 1%

        // Verify total
        let total: u64 = amounts.iter().sum();
        assert_eq!(total, 1_000_000_000);
    }

    #[test]
    fn test_split_amount_invalid_percentages() {
        // Test invalid percentage sum
        let result = split_amount(1_000_000_000, &[5000, 3000]); // Only 80%
        assert!(result.is_err());

        let result = split_amount(1_000_000_000, &[6000, 5000]); // 110%
        assert!(result.is_err());
    }
}

