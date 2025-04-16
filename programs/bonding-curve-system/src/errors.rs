use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid pool")]
    InvalidPool,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("NFT already sold")]
    NFTAlreadySold,
    #[msg("Insufficient pool balance")]
    InsufficientPoolBalance,
}
