use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    
    #[msg("Pool is inactive")]
    PoolInactive,
    
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
    
    #[msg("Migration threshold not met")]
    ThresholdNotMet,
    
    #[msg("Invalid price")]
    InvalidPrice,
    
    #[msg("Pool already migrated to Tensor")]
    AlreadyMigrated,
}
