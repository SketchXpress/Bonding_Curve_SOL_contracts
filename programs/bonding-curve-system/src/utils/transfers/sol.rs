use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
    utils::debug::*,
    debug_log,
};

/// Transfer SOL between accounts
pub fn transfer_sol(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
) -> Result<()> {
    let mut debug_ctx = DebugContext::new("transfer_sol");
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} lamports", amount);

    // Validate transfer
    validate_sol_transfer(from, to, amount, &mut debug_ctx)?;

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

/// Transfer lamports with debug context
pub fn transfer_lamports(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
) -> Result<()> {
    transfer_sol(from, to, amount)
}

/// Transfer SOL with detailed logging
pub fn transfer_sol_with_context(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
    context: &str,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step(&format!("sol_transfer_{}", context));
    debug_log!(debug_ctx, LogLevel::Debug, "Transferring {} lamports for {}", amount, context);

    // Validate transfer
    validate_sol_transfer(from, to, amount, debug_ctx)?;

    // Execute transfer
    **from.try_borrow_mut_lamports()? = from.lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::InsufficientBalance)?;

    **to.try_borrow_mut_lamports()? = to.lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    debug_log!(debug_ctx, LogLevel::Debug, "SOL transfer completed for {}", context);
    Ok(())
}

/// Validate SOL transfer parameters
fn validate_sol_transfer(
    from: &AccountInfo,
    to: &AccountInfo,
    amount: u64,
    debug_ctx: &mut DebugContext,
) -> Result<()> {
    debug_ctx.step("sol_transfer_validation");

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

    debug_log!(debug_ctx, LogLevel::Debug, "SOL transfer validation passed");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::system_program;

    #[test]
    fn test_validate_sol_transfer() {
        let mut debug_ctx = DebugContext::new("test");
        
        // Create mock account infos
        let from_key = Pubkey::new_unique();
        let to_key = Pubkey::new_unique();
        
        // Test zero amount
        let result = validate_sol_transfer(
            &AccountInfo::new(
                &from_key,
                false,
                true,
                &mut 1000000,
                &mut [],
                &system_program::ID,
                false,
                0,
            ),
            &AccountInfo::new(
                &to_key,
                false,
                true,
                &mut 0,
                &mut [],
                &system_program::ID,
                false,
                0,
            ),
            0,
            &mut debug_ctx,
        );
        assert!(result.is_err());
    }
}

