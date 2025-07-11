use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // Math errors
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Math underflow occurred")]
    MathUnderflow,
    #[msg("Division by zero")]
    DivisionByZero,

    // Bonding curve errors
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
    #[msg("Invalid pool")]
    InvalidPool,
    #[msg("Escrow account not empty after transfer")]
    EscrowNotEmpty,
    #[msg("Price calculation failed")]
    PriceCalculationFailed,

    // Account validation errors
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("NFT already sold")]
    NFTAlreadySold,
    #[msg("Insufficient NFT balance")]
    InsufficientNftBalance,
    #[msg("Invalid NFT owner")]
    InvalidNftOwner,
    #[msg("Invalid NFT mint")]
    InvalidNftMint,
    #[msg("Unauthorized access")]
    Unauthorized,

    // Bidding system errors
    #[msg("Invalid bid amount")]
    InvalidBidAmount,
    #[msg("Bid too low")]
    BidTooLow,
    #[msg("Bid is below bonding curve price")]
    BidBelowBondingCurve,
    #[msg("Bid has expired")]
    BidExpired,
    #[msg("Bid not found")]
    BidNotFound,
    #[msg("Invalid bid status")]
    InvalidBidStatus,
    #[msg("Cannot bid on own NFT")]
    CannotBidOnOwnNft,
    #[msg("Cannot cancel bid")]
    CannotCancelBid,
    #[msg("Cannot accept bid")]
    CannotAcceptBid,
    #[msg("Unauthorized bid cancellation")]
    UnauthorizedBidCancellation,
    #[msg("Unauthorized bid acceptance")]
    UnauthorizedBidAcceptance,

    // Listing errors
    #[msg("Bid listing not active")]
    BidListingNotActive,
    #[msg("Bid listing expired")]
    BidListingExpired,
    #[msg("Cannot bid on own listing")]
    CannotBidOnOwnListing,
    #[msg("NFT is not listed for bids")]
    NftNotListed,
    #[msg("Invalid listing status")]
    InvalidListingStatus,
    #[msg("Listing has expired")]
    ListingExpired,
    #[msg("Invalid duration")]
    InvalidDuration,

    // Revenue distribution errors
    #[msg("Revenue distribution failed")]
    RevenueDistributionFailed,
    #[msg("Invalid revenue split")]
    InvalidRevenueSplit,

    // Collection errors
    #[msg("Empty collection")]
    EmptyCollection,
    #[msg("No fees to distribute")]
    NoFeesToDistribute,
    #[msg("Collection distribution failed")]
    CollectionDistributionFailed,

    // Dynamic pricing errors
    #[msg("Bid must be higher than current bonding curve price")]
    BidMustExceedBondingCurve,
    #[msg("Minimum premium not met")]
    MinimumPremiumNotMet,
    #[msg("Price update failed")]
    PriceUpdateFailed,
    #[msg("Invalid pricing configuration")]
    InvalidPricingConfig,

    // General errors
    #[msg("Invalid account")]
    InvalidAccount,
    #[msg("Account not initialized")]
    AccountNotInitialized,
    #[msg("Invalid instruction")]
    InvalidInstruction,
    #[msg("Operation not allowed")]
    OperationNotAllowed,
}

