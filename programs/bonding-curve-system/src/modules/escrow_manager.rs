use anchor_lang::prelude::*;
use crate::state::{EscrowAccount, Pool};
use crate::errors::ErrorCode;

pub struct EscrowManager;

impl EscrowManager {
    pub fn create_escrow(
        pool: &Pool,
        escrow: &mut EscrowAccount,
        amount: u64,
        owner: Pubkey,
    ) -> Result<()> {
        escrow.pool = pool.key();
        escrow.amount = amount;
        escrow.owner = owner;
        escrow.initialized = true;
        Ok(())
    }

    pub fn increase_escrow(
        escrow: &mut EscrowAccount,
        additional_amount: u64,
    ) -> Result<()> {
        escrow.amount = escrow.amount
            .checked_add(additional_amount)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn release_escrow(
        escrow: &mut EscrowAccount,
        amount: u64,
    ) -> Result<()> {
        require!(escrow.amount >= amount, ErrorCode::InsufficientEscrowBalance);
        escrow.amount = escrow.amount
            .checked_sub(amount)
            .ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn close_escrow(escrow: &mut EscrowAccount) -> Result<()> {
        require!(escrow.amount == 0, ErrorCode::NonEmptyEscrow);
        escrow.initialized = false;
        Ok(())
    }
}
