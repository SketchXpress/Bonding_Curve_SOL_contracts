use anchor_lang::prelude::*;
use crate::state::Pool;
use crate::errors::ErrorCode;

pub struct NFTManager;

impl NFTManager {
    pub fn create_nft(
        pool: &mut Pool,
        mint: Pubkey,
        owner: Pubkey,
    ) -> Result<()> {
        // Update pool statistics
        pool.current_supply = pool.current_supply
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;
            
        pool.total_minted = pool.total_minted
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }

    pub fn transfer_nft(
        pool: &mut Pool,
        from: Pubkey,
        to: Pubkey,
    ) -> Result<()> {
        // Update holder statistics if needed
        if pool.holders.contains(&from) && !pool.holders.contains(&to) {
            pool.holder_count = pool.holder_count
                .checked_add(1)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        Ok(())
    }

    pub fn burn_nft(
        pool: &mut Pool,
        mint: Pubkey,
    ) -> Result<()> {
        // Update pool statistics
        pool.current_supply = pool.current_supply
            .checked_sub(1)
            .ok_or(ErrorCode::MathOverflow)?;
            
        pool.total_burned = pool.total_burned
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        Ok(())
    }
}
