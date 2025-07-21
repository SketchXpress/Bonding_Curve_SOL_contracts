use anchor_lang::prelude::*;

/// Clean, focused error codes for SketchXpress bonding curve system
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
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner = 6005,

    #[msg("Invalid authority")]
    InvalidAuthority = 6006,
    
    #[msg("Math error")]
    MathError = 6007,
    
    #[msg("Value too low")]
    ValueTooLow = 6008,
    
    #[msg("Value too high")]
    ValueTooHigh = 6009,

    // === MATH ERRORS (6020-6029) ===
    #[msg("Math overflow")]
    MathOverflow = 6020,
    
    #[msg("Math underflow")]
    MathUnderflow = 6021,
    
    #[msg("Division by zero")]
    DivisionByZero = 6022,

    // === POOL ERRORS (6030-6039) ===
    #[msg("Pool inactive")]
    PoolInactive = 6030,
    
    #[msg("Already migrated")]
    AlreadyMigrated = 6031,
    
    #[msg("Max supply reached")]
    MaxSupplyReached = 6032,
    
    #[msg("Threshold not met")]
    ThresholdNotMet = 6033,

    // === NFT ERRORS (6040-6049) ===
    #[msg("Invalid NFT mint")]
    InvalidNftMint = 6040,
    
    #[msg("NFT not owned")]
    NftNotOwned = 6041,
    
    #[msg("Cannot operate on own NFT")]
    CannotOperateOnOwnNft = 6042,
    
    #[msg("NFT already sold")]
    NFTAlreadySold = 6043,
    
    #[msg("Insufficient NFT balance")]
    InsufficientNftBalance = 6044,

    // === BIDDING ERRORS (6050-6069) ===
    #[msg("Bid too high")]
    BidTooHigh = 6050,
    
    #[msg("Bid must exceed bonding curve")]
    BidMustExceedBondingCurve = 6051,
    
    #[msg("Insufficient bid increment")]
    InsufficientBidIncrement = 6052,
    
    #[msg("Bid listing expired")]
    ListingExpired = 6053,
    
    #[msg("Invalid bid amount")]
    InvalidBidAmount = 6054,
    
    #[msg("Bid not found")]
    BidNotFound = 6055,
    
    #[msg("Unauthorized bid cancellation")]
    UnauthorizedBidCancellation = 6056,
    
    #[msg("Cannot cancel bid")]
    CannotCancelBid = 6057,

    #[msg("Bid too low")]
    BidTooLow = 6058,
    
    #[msg("Bid expired")]
    BidExpired = 6059,
    
    #[msg("Cannot bid on own NFT")]
    CannotBidOnOwnNft = 6060,
    
    #[msg("Bid below bonding curve")]
    BidBelowBondingCurve = 6061,
    
    #[msg("Insufficient premium")]
    InsufficientPremium = 6062,

    // === LISTING ERRORS (6070-6089) ===
    #[msg("Escrow not empty")]
    EscrowNotEmpty = 6070,
    
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance = 6071,
    
    #[msg("Invalid revenue split")]
    InvalidRevenueSplit = 6072,
    
    // === TIME ERRORS (6090-6099) ===
    #[msg("Duration too short")]
    DurationTooShort = 6090,
    
    #[msg("Duration too long")]
    DurationTooLong = 6091,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp = 6092,

    // === STRING ERRORS (6100-6109) ===
    #[msg("Empty string")]
    EmptyString = 6100,
    
    #[msg("String too long")]
    StringTooLong = 6101,
    
    // === FUNDS ERRORS (6110-6119) ===
    #[msg("Insufficient funds")]
    InsufficientFunds = 6110,
    
    #[msg("Insufficient account space")]
    InsufficientAccountSpace = 6111,
    
    // === BID ERRORS (6120-6129) ===
    #[msg("Advanced bid validation")]
    AdvancedBidValidation = 6120,

    // === PRICE ERRORS (6130-6139) ===
    #[msg("Price exceeds maximum allowed")]
    PriceExceedsMaximum = 6130,

    // === LISTING ERRORS (6140-6149) ===
    #[msg("Invalid listing status")]
    InvalidListingStatus = 6140,

    // === TIME ERRORS (6150-6159) ===
    #[msg("Invalid duration")]
    InvalidDuration = 6150,
    
    #[msg("Expired")]
    Expired = 6151,

    // === VALIDATION ERRORS (6160-6179) ===
    #[msg("Invalid percentage")]
    InvalidPercentage = 6160,
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
            ErrorCode::PriceExceedsMaximum => "The NFT price exceeds your specified maximum",
            _ => "An error occurred",
        }
    }
}

