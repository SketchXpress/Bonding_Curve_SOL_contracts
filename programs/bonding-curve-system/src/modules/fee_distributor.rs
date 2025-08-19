use anchor_lang::prelude::*;
use crate::state::Pool;
use crate::constants::{PLATFORM_FEE_PERCENTAGE, CREATOR_FEE_PERCENTAGE, HOLDER_FEE_PERCENTAGE};
use crate::errors::ErrorCode;

pub struct FeeDistributor;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct FeeBreakdown {
    pub platform_fee: u64,
    pub creator_fee: u64,
    pub holder_fee: u64,
}

impl FeeDistributor {
    pub fn calculate_fees(amount: u64) -> Result<FeeBreakdown> {
        let platform_fee = (amount as u128)
            .checked_mul(PLATFORM_FEE_PERCENTAGE as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        let creator_fee = (amount as u128)
            .checked_mul(CREATOR_FEE_PERCENTAGE as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        let holder_fee = (amount as u128)
            .checked_mul(HOLDER_FEE_PERCENTAGE as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        Ok(FeeBreakdown {
            platform_fee,
            creator_fee,
            holder_fee,
        })
    }

    pub fn distribute_fees(
        pool: &mut Pool,
        fees: FeeBreakdown,
    ) -> Result<()> {
        // Update pool fee statistics
        pool.accumulated_platform_fees = pool.accumulated_platform_fees
            .checked_add(fees.platform_fee)
            .ok_or(ErrorCode::MathOverflow)?;
            
        pool.accumulated_creator_fees = pool.accumulated_creator_fees
            .checked_add(fees.creator_fee)
            .ok_or(ErrorCode::MathOverflow)?;
            
        pool.accumulated_holder_fees = pool.accumulated_holder_fees
            .checked_add(fees.holder_fee)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }
}
