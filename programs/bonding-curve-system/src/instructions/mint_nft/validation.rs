use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
    state::BondingCurvePool,
    math::calculate_bonding_curve_price,
};
use super::MintNftArgs;

/// Validate mint input arguments
pub fn validate_mint_inputs(args: &MintNftArgs) -> Result<()> {
    if args.name.is_empty() || args.name.len() > 32 {
        msg!("Invalid name length: {}", args.name.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.symbol.is_empty() || args.symbol.len() > 10 {
        msg!("Invalid symbol length: {}", args.symbol.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.uri.is_empty() || args.uri.len() > 200 {
        msg!("Invalid URI length: {}", args.uri.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    msg!("Input validation passed");
    Ok(())
}

/// Calculate current mint price from bonding curve
pub fn calculate_mint_price(pool: &BondingCurvePool) -> Result<u64> {
    if !pool.state.is_active {
        msg!("Pool is inactive");
        return Err(ErrorCode::PoolInactive.into());
    }

    if pool.state.current_supply >= pool.config.max_supply {
        msg!("Max supply reached");
        return Err(ErrorCode::MaxSupplyReached.into());
    }

    let price = calculate_bonding_curve_price(
        pool.config.base_price,
        pool.config.growth_factor,
        pool.state.current_supply,
    )?;

    msg!("Calculated mint price: {}", price);
    Ok(price)
}

/// Validate minter has sufficient balance
pub fn validate_payment(minter: &Signer, required_amount: u64) -> Result<()> {
    
    if minter.lamports() < required_amount {
        msg!(
            "Insufficient balance: has {}, needs {}", 
            minter.lamports(), 
            required_amount
        );
        return Err(ErrorCode::InsufficientBalance.into());
    }

    msg!("Payment validation passed");
    Ok(())
}

