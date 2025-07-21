use anchor_lang::prelude::*;

/// Calculate the revenue share for pool creators
pub fn calculate_revenue_share(total_amount: u64, share_bps: u16) -> Result<u64> {
    let share = (total_amount as u128)
        .checked_mul(share_bps as u128)
        .and_then(|x| x.checked_div(10000))
        .and_then(|x| u64::try_from(x).ok())
        .ok_or(crate::errors::ErrorCode::MathError)?;

    Ok(share)
}

/// Calculate the remaining amount after revenue share
pub fn calculate_remaining_after_share(total_amount: u64, share_amount: u64) -> Result<u64> {
    total_amount
        .checked_sub(share_amount)
        .ok_or(crate::errors::ErrorCode::MathError.into())
}
