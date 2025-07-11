use anchor_lang::prelude::*;

/// Clean, focused error codes for SketchXpress
#[error_code]
pub enum ErrorCode {
    // === GENERAL ERRORS (6000-6019) ===
    #[msg("Invalid amount")]
    InvalidAmount = 6000,
    
    #[msg("Insufficient balance")]
    InsufficientBalance = 6001,
    
    #[msg("Unauthorized")]
    Unauthorized = 6002,
    
    #[msg("Invalid account")]
    InvalidAccount = 6003,
    
    #[msg("Account not initialized")]
    AccountNotInitialized = 6004,

    // === MATH ERRORS (6020-6029) ===
    #[msg("Math overflow")]
    MathOverflow = 6020,
    
    #[msg("Math underflow")]
    MathUnderflow = 6021,

    // === POOL ERRORS (6030-6039) ===
    #[msg("Pool inactive")]
    PoolInactive = 6030,
    
    #[msg("Already migrated")]
    AlreadyMigrated = 6031,
    
    #[msg("Max supply reached")]
    MaxSupplyReached = 6032,

    // === NFT ERRORS (6040-6049) ===
    #[msg("Invalid NFT mint")]
    InvalidNftMint = 6040,
    
    #[msg("NFT not owned")]
    NftNotOwned = 6041,
    
    #[msg("Cannot operate on own NFT")]
    CannotOperateOnOwnNft = 6042,

    // === BIDDING ERRORS (6050-6069) ===
    #[msg("Bid too low")]
    BidTooLow = 6050,
    
    #[msg("Bid expired")]
    BidExpired = 6051,
    
    #[msg("Cannot bid on own NFT")]
    CannotBidOnOwnNft = 6052,
    
    #[msg("Bid below bonding curve price")]
    BidBelowBondingCurve = 6053,
    
    #[msg("Insufficient premium")]
    InsufficientPremium = 6054,

    // === LISTING ERRORS (6070-6079) ===
    #[msg("Listing expired")]
    ListingExpired = 6070,
    
    #[msg("Invalid listing status")]
    InvalidListingStatus = 6071,

    // === TIME ERRORS (6080-6089) ===
    #[msg("Invalid duration")]
    InvalidDuration = 6080,
    
    #[msg("Expired")]
    Expired = 6081,
}

impl ErrorCode {
    /// Get user-friendly message
    pub fn user_message(&self) -> &'static str {
        match self {
            ErrorCode::InsufficientBalance => "You don't have enough SOL",
            ErrorCode::BidTooLow => "Your bid is too low",
            ErrorCode::BidBelowBondingCurve => "Bid must exceed current NFT price",
            ErrorCode::CannotBidOnOwnNft => "You cannot bid on your own NFT",
            ErrorCode::ListingExpired => "This listing has expired",
            ErrorCode::MaxSupplyReached => "Maximum supply reached",
            ErrorCode::Unauthorized => "You are not authorized",
            _ => "An error occurred",
        }
    }
}

