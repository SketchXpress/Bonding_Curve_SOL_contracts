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
    
    #[msg("Invalid authority")]
    InvalidAuthority,
    
    #[msg("NFT already sold")]
    NFTAlreadySold,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Invalid pool")]
    InvalidPool,

    #[msg("Escrow account not empty after transfer")] // Added new error code
    EscrowNotEmpty,
}

