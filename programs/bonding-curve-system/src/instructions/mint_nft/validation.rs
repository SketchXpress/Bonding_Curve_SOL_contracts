use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
    state::BondingCurvePool,
    utils::debug::*,
    debug_log,
    math::calculate_bonding_curve_price,
};
use super::MintNftArgs;

/// Validate mint input arguments
pub fn validate_mint_inputs(args: &MintNftArgs, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("input_validation");
    
    if args.name.is_empty() || args.name.len() > 32 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid name length: {}", args.name.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.symbol.is_empty() || args.symbol.len() > 10 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid symbol length: {}", args.symbol.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    if args.uri.is_empty() || args.uri.len() > 200 {
        debug_log!(debug_ctx, LogLevel::Error, "Invalid URI length: {}", args.uri.len());
        return Err(ErrorCode::InvalidAmount.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Input validation passed");
    Ok(())
}

/// Calculate current mint price from bonding curve
pub fn calculate_mint_price(pool: &BondingCurvePool, debug_ctx: &mut DebugContext) -> Result<u64> {
    debug_ctx.step("price_calculation");
    
    if !pool.state.is_active {
        debug_log!(debug_ctx, LogLevel::Error, "Pool is inactive");
        return Err(ErrorCode::PoolInactive.into());
    }

    if pool.state.current_supply >= pool.config.max_supply {
        debug_log!(debug_ctx, LogLevel::Error, "Max supply reached");
        return Err(ErrorCode::MaxSupplyReached.into());
    }

    let price = calculate_bonding_curve_price(
        pool.config.base_price,
        pool.config.growth_factor,
        pool.state.current_supply,
    )?;

    debug_log!(debug_ctx, LogLevel::Debug, "Calculated mint price: {}", price);
    Ok(price)
}

/// Validate minter has sufficient balance
pub fn validate_payment(minter: &Signer, required_amount: u64, debug_ctx: &mut DebugContext) -> Result<()> {
    debug_ctx.step("payment_validation");
    
    if minter.lamports() < required_amount {
        debug_log!(
            debug_ctx, 
            LogLevel::Error, 
            "Insufficient balance: has {}, needs {}", 
            minter.lamports(), 
            required_amount
        );
        return Err(ErrorCode::InsufficientBalance.into());
    }

    debug_log!(debug_ctx, LogLevel::Debug, "Payment validation passed");
    Ok(())
}

