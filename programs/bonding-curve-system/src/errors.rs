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

    #[msg("Escrow account not empty after transfer")]
    EscrowNotEmpty,

    // New bidding system errors
    #[msg("Invalid bid amount")]
    InvalidBidAmount,
    
    #[msg("Bid too low")]
    BidTooLow,
    
    #[msg("Bid listing not active")]
    BidListingNotActive,
    
    #[msg("Bid listing expired")]
    BidListingExpired,
    
    #[msg("Cannot bid on own listing")]
    CannotBidOnOwnListing,
    
    #[msg("Insufficient NFT balance")]
    InsufficientNftBalance,
    
    #[msg("Unauthorized bid cancellation")]
    UnauthorizedBidCancellation,
    
    #[msg("Cannot cancel bid")]
    CannotCancelBid,
    
    #[msg("Bid not found")]
    BidNotFound,
    
    #[msg("Cannot accept bid")]
    CannotAcceptBid,
    
    #[msg("Unauthorized bid acceptance")]
    UnauthorizedBidAcceptance,
    
    #[msg("Revenue distribution failed")]
    RevenueDistributionFailed,
}

