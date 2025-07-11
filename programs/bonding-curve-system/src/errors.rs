use anchor_lang::prelude::*;

/// Comprehensive error codes for the SketchXpress Bonding Curve System
#[error_code]
pub enum ErrorCode {
    // === GENERAL ERRORS (6000-6099) ===
    
    #[msg("Invalid amount provided")]
    InvalidAmount = 6000,
    
    #[msg("Insufficient balance")]
    InsufficientBalance = 6001,
    
    #[msg("Unauthorized access")]
    Unauthorized = 6002,
    
    #[msg("Invalid account provided")]
    InvalidAccount = 6003,
    
    #[msg("Account not initialized")]
    AccountNotInitialized = 6004,
    
    #[msg("Invalid account owner")]
    InvalidAccountOwner = 6005,
    
    #[msg("Insufficient account space")]
    InsufficientAccountSpace = 6006,
    
    #[msg("Account already initialized")]
    AccountAlreadyInitialized = 6007,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp = 6008,
    
    #[msg("Operation expired")]
    Expired = 6009,

    // === MATH ERRORS (6100-6199) ===
    
    #[msg("Math overflow")]
    MathOverflow = 6100,
    
    #[msg("Math underflow")]
    MathUnderflow = 6101,
    
    #[msg("Division by zero")]
    DivisionByZero = 6102,
    
    #[msg("Invalid percentage")]
    InvalidPercentage = 6103,
    
    #[msg("Value too low")]
    ValueTooLow = 6104,
    
    #[msg("Value too high")]
    ValueTooHigh = 6105,

    // === POOL ERRORS (6200-6299) ===
    
    #[msg("Pool is inactive")]
    PoolInactive = 6200,
    
    #[msg("Pool already migrated")]
    AlreadyMigrated = 6201,
    
    #[msg("Migration threshold not met")]
    ThresholdNotMet = 6202,
    
    #[msg("Invalid pool configuration")]
    InvalidPoolConfig = 6203,
    
    #[msg("Pool creation failed")]
    PoolCreationFailed = 6204,
    
    #[msg("Pool not found")]
    PoolNotFound = 6205,
    
    #[msg("Invalid pricing configuration")]
    InvalidPricingConfig = 6206,
    
    #[msg("Pool paused")]
    PoolPaused = 6207,

    // === NFT ERRORS (6300-6399) ===
    
    #[msg("Invalid NFT mint")]
    InvalidNftMint = 6300,
    
    #[msg("Insufficient NFT balance")]
    InsufficientNftBalance = 6301,
    
    #[msg("NFT not found")]
    NftNotFound = 6302,
    
    #[msg("NFT already exists")]
    NftAlreadyExists = 6303,
    
    #[msg("Invalid NFT metadata")]
    InvalidNftMetadata = 6304,
    
    #[msg("NFT transfer failed")]
    NftTransferFailed = 6305,
    
    #[msg("Cannot operate on own NFT")]
    CannotOperateOnOwnNft = 6306,
    
    #[msg("NFT not owned by user")]
    NftNotOwned = 6307,
    
    #[msg("Max supply reached")]
    MaxSupplyReached = 6308,

    // === BIDDING ERRORS (6400-6499) ===
    
    #[msg("Invalid bid amount")]
    InvalidBidAmount = 6400,
    
    #[msg("Bid too low")]
    BidTooLow = 6401,
    
    #[msg("Bid too high")]
    BidTooHigh = 6402,
    
    #[msg("Bid not found")]
    BidNotFound = 6403,
    
    #[msg("Bid already exists")]
    BidAlreadyExists = 6404,
    
    #[msg("Bid expired")]
    BidExpired = 6405,
    
    #[msg("Cannot bid on own NFT")]
    CannotBidOnOwnNft = 6406,
    
    #[msg("Bid listing not active")]
    BidListingNotActive = 6407,
    
    #[msg("Bid listing expired")]
    BidListingExpired = 6408,
    
    #[msg("Invalid bid status")]
    InvalidBidStatus = 6409,
    
    #[msg("Insufficient bid increment")]
    InsufficientBidIncrement = 6410,
    
    #[msg("Bid must exceed bonding curve price")]
    BidMustExceedBondingCurve = 6411,
    
    #[msg("Bid below bonding curve price")]
    BidBelowBondingCurve = 6412,
    
    #[msg("Insufficient premium above bonding curve")]
    InsufficientPremium = 6413,

    // === LISTING ERRORS (6500-6599) ===
    
    #[msg("Invalid listing status")]
    InvalidListingStatus = 6500,
    
    #[msg("Listing not found")]
    ListingNotFound = 6501,
    
    #[msg("Listing already exists")]
    ListingAlreadyExists = 6502,
    
    #[msg("Listing expired")]
    ListingExpired = 6503,
    
    #[msg("Cannot list own NFT")]
    CannotListOwnNft = 6504,
    
    #[msg("Listing creation failed")]
    ListingCreationFailed = 6505,
    
    #[msg("Invalid listing duration")]
    InvalidListingDuration = 6506,

    // === ESCROW ERRORS (6600-6699) ===
    
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance = 6600,
    
    #[msg("Escrow not found")]
    EscrowNotFound = 6601,
    
    #[msg("Escrow creation failed")]
    EscrowCreationFailed = 6602,
    
    #[msg("Escrow transfer failed")]
    EscrowTransferFailed = 6603,
    
    #[msg("Escrow not empty")]
    EscrowNotEmpty = 6604,
    
    #[msg("Invalid escrow amount")]
    InvalidEscrowAmount = 6605,

    // === REVENUE DISTRIBUTION ERRORS (6700-6799) ===
    
    #[msg("Invalid revenue split")]
    InvalidRevenueSplit = 6700,
    
    #[msg("Revenue distribution failed")]
    RevenueDistributionFailed = 6701,
    
    #[msg("Invalid minter tracker")]
    InvalidMinterTracker = 6702,
    
    #[msg("Collection distribution failed")]
    CollectionDistributionFailed = 6703,
    
    #[msg("Insufficient collection fees")]
    InsufficientCollectionFees = 6704,
    
    #[msg("Fee calculation error")]
    FeeCalculationError = 6705,

    // === DURATION AND TIME ERRORS (6800-6899) ===
    
    #[msg("Invalid duration")]
    InvalidDuration = 6800,
    
    #[msg("Duration too short")]
    DurationTooShort = 6801,
    
    #[msg("Duration too long")]
    DurationTooLong = 6802,
    
    #[msg("Timestamp in the past")]
    TimestampInPast = 6803,
    
    #[msg("Timestamp too far in future")]
    TimestampTooFarInFuture = 6804,

    // === STRING AND DATA ERRORS (6900-6999) ===
    
    #[msg("Empty string not allowed")]
    EmptyString = 6900,
    
    #[msg("String too long")]
    StringTooLong = 6901,
    
    #[msg("Invalid string format")]
    InvalidStringFormat = 6902,
    
    #[msg("Invalid data format")]
    InvalidDataFormat = 6903,
    
    #[msg("Data corruption detected")]
    DataCorruption = 6904,

    // === BONDING CURVE SPECIFIC ERRORS (7000-7099) ===
    
    #[msg("Invalid bonding curve parameters")]
    InvalidBondingCurveParams = 7000,
    
    #[msg("Bonding curve calculation failed")]
    BondingCurveCalculationFailed = 7001,
    
    #[msg("Price calculation overflow")]
    PriceCalculationOverflow = 7002,
    
    #[msg("Market cap calculation failed")]
    MarketCapCalculationFailed = 7003,
    
    #[msg("Invalid growth factor")]
    InvalidGrowthFactor = 7004,
    
    #[msg("Base price too low")]
    BasePriceTooLow = 7005,
    
    #[msg("Base price too high")]
    BasePriceTooHigh = 7006,

    // === DYNAMIC PRICING ERRORS (7100-7199) ===
    
    #[msg("Dynamic pricing validation failed")]
    DynamicPricingValidationFailed = 7100,
    
    #[msg("Premium calculation failed")]
    PremiumCalculationFailed = 7101,
    
    #[msg("Bid increment calculation failed")]
    BidIncrementCalculationFailed = 7102,
    
    #[msg("Price update failed")]
    PriceUpdateFailed = 7103,
    
    #[msg("Minimum bid calculation failed")]
    MinimumBidCalculationFailed = 7104,

    // === COLLECTION ERRORS (7200-7299) ===
    
    #[msg("Invalid collection")]
    InvalidCollection = 7200,
    
    #[msg("Collection not found")]
    CollectionNotFound = 7201,
    
    #[msg("Collection already exists")]
    CollectionAlreadyExists = 7202,
    
    #[msg("Collection creation failed")]
    CollectionCreationFailed = 7203,
    
    #[msg("Invalid collection metadata")]
    InvalidCollectionMetadata = 7204,
    
    #[msg("Collection fee distribution failed")]
    CollectionFeeDistributionFailed = 7205,

    // === MIGRATION ERRORS (7300-7399) ===
    
    #[msg("Migration failed")]
    MigrationFailed = 7300,
    
    #[msg("Migration not allowed")]
    MigrationNotAllowed = 7301,
    
    #[msg("Migration already in progress")]
    MigrationInProgress = 7302,
    
    #[msg("Migration threshold calculation failed")]
    MigrationThresholdCalculationFailed = 7303,
    
    #[msg("Tensor integration failed")]
    TensorIntegrationFailed = 7304,

    // === ADMIN ERRORS (7400-7499) ===
    
    #[msg("Admin operation failed")]
    AdminOperationFailed = 7400,
    
    #[msg("Not authorized as admin")]
    NotAuthorizedAsAdmin = 7401,
    
    #[msg("Invalid admin configuration")]
    InvalidAdminConfiguration = 7402,
    
    #[msg("Emergency pause failed")]
    EmergencyPauseFailed = 7403,
    
    #[msg("Configuration update failed")]
    ConfigurationUpdateFailed = 7404,

    // === SYSTEM ERRORS (7500-7599) ===
    
    #[msg("System error")]
    SystemError = 7500,
    
    #[msg("Internal state inconsistency")]
    InternalStateInconsistency = 7501,
    
    #[msg("Critical system failure")]
    CriticalSystemFailure = 7502,
    
    #[msg("Resource exhausted")]
    ResourceExhausted = 7503,
    
    #[msg("Operation not supported")]
    OperationNotSupported = 7504,
}

impl ErrorCode {
    /// Get error category for better error handling
    pub fn category(&self) -> ErrorCategory {
        match *self as u32 {
            6000..=6099 => ErrorCategory::General,
            6100..=6199 => ErrorCategory::Math,
            6200..=6299 => ErrorCategory::Pool,
            6300..=6399 => ErrorCategory::Nft,
            6400..=6499 => ErrorCategory::Bidding,
            6500..=6599 => ErrorCategory::Listing,
            6600..=6699 => ErrorCategory::Escrow,
            6700..=6799 => ErrorCategory::Revenue,
            6800..=6899 => ErrorCategory::Time,
            6900..=6999 => ErrorCategory::Data,
            7000..=7099 => ErrorCategory::BondingCurve,
            7100..=7199 => ErrorCategory::DynamicPricing,
            7200..=7299 => ErrorCategory::Collection,
            7300..=7399 => ErrorCategory::Migration,
            7400..=7499 => ErrorCategory::Admin,
            7500..=7599 => ErrorCategory::System,
            _ => ErrorCategory::Unknown,
        }
    }

    /// Check if error is recoverable
    pub fn is_recoverable(&self) -> bool {
        match self.category() {
            ErrorCategory::Math => false, // Math errors are usually fatal
            ErrorCategory::System => false, // System errors are critical
            ErrorCategory::General => true, // Most general errors can be retried
            ErrorCategory::Bidding => true, // Bidding errors can often be corrected
            ErrorCategory::Listing => true, // Listing errors can be corrected
            _ => true, // Default to recoverable
        }
    }

    /// Get user-friendly error message
    pub fn user_message(&self) -> &'static str {
        match self {
            // User-friendly messages for common errors
            ErrorCode::InsufficientBalance => "You don't have enough SOL for this transaction",
            ErrorCode::BidTooLow => "Your bid is too low. Please increase your bid amount",
            ErrorCode::BidMustExceedBondingCurve => "Your bid must be higher than the current NFT price",
            ErrorCode::CannotBidOnOwnNft => "You cannot bid on your own NFT",
            ErrorCode::BidListingExpired => "This listing has expired",
            ErrorCode::MaxSupplyReached => "Maximum supply has been reached for this collection",
            ErrorCode::PoolInactive => "This collection is currently inactive",
            ErrorCode::AlreadyMigrated => "This collection has already been migrated",
            ErrorCode::Unauthorized => "You are not authorized to perform this action",
            ErrorCode::InvalidAmount => "Invalid amount specified",
            ErrorCode::InsufficientPremium => "Your bid doesn't meet the minimum premium requirement",
            _ => "An error occurred. Please try again or contact support",
        }
    }

    /// Get technical details for debugging
    pub fn technical_details(&self) -> String {
        format!(
            "Error Code: {} | Category: {:?} | Recoverable: {} | Message: {}",
            *self as u32,
            self.category(),
            self.is_recoverable(),
            self.user_message()
        )
    }
}

/// Error categories for better error handling
#[derive(Debug, Clone, PartialEq)]
pub enum ErrorCategory {
    General,
    Math,
    Pool,
    Nft,
    Bidding,
    Listing,
    Escrow,
    Revenue,
    Time,
    Data,
    BondingCurve,
    DynamicPricing,
    Collection,
    Migration,
    Admin,
    System,
    Unknown,
}

/// Error context for better debugging
#[derive(Debug, Clone)]
pub struct ErrorContext {
    pub error_code: ErrorCode,
    pub instruction: String,
    pub account_context: Option<String>,
    pub additional_info: Option<String>,
    pub timestamp: i64,
}

impl ErrorContext {
    pub fn new(
        error_code: ErrorCode,
        instruction: &str,
        account_context: Option<&str>,
        additional_info: Option<&str>,
    ) -> Self {
        Self {
            error_code,
            instruction: instruction.to_string(),
            account_context: account_context.map(|s| s.to_string()),
            additional_info: additional_info.map(|s| s.to_string()),
            timestamp: Clock::get().map(|c| c.unix_timestamp).unwrap_or(0),
        }
    }

    pub fn to_program_error(&self) -> ProgramError {
        ProgramError::Custom(self.error_code as u32)
    }
}

/// Macro for creating error contexts easily
#[macro_export]
macro_rules! error_context {
    ($error:expr, $instruction:expr) => {
        ErrorContext::new($error, $instruction, None, None)
    };
    ($error:expr, $instruction:expr, $account:expr) => {
        ErrorContext::new($error, $instruction, Some($account), None)
    };
    ($error:expr, $instruction:expr, $account:expr, $info:expr) => {
        ErrorContext::new($error, $instruction, Some($account), Some($info))
    };
}

/// Result type with error context
pub type ContextResult<T> = std::result::Result<T, ErrorContext>;

/// Convert anchor Result to ContextResult
pub trait ToContextResult<T> {
    fn with_context(self, instruction: &str) -> ContextResult<T>;
    fn with_account_context(self, instruction: &str, account: &str) -> ContextResult<T>;
}

impl<T> ToContextResult<T> for Result<T> {
    fn with_context(self, instruction: &str) -> ContextResult<T> {
        self.map_err(|e| {
            if let Some(anchor_error) = e.downcast_ref::<anchor_lang::error::Error>() {
                if let anchor_lang::error::Error::AnchorError(anchor_error) = anchor_error {
                    if let Some(error_code) = ErrorCode::from_u32(anchor_error.error_code_number) {
                        return ErrorContext::new(error_code, instruction, None, None);
                    }
                }
            }
            ErrorContext::new(ErrorCode::SystemError, instruction, None, Some(&e.to_string()))
        })
    }

    fn with_account_context(self, instruction: &str, account: &str) -> ContextResult<T> {
        self.map_err(|e| {
            if let Some(anchor_error) = e.downcast_ref::<anchor_lang::error::Error>() {
                if let anchor_lang::error::Error::AnchorError(anchor_error) = anchor_error {
                    if let Some(error_code) = ErrorCode::from_u32(anchor_error.error_code_number) {
                        return ErrorContext::new(error_code, instruction, Some(account), None);
                    }
                }
            }
            ErrorContext::new(
                ErrorCode::SystemError,
                instruction,
                Some(account),
                Some(&e.to_string()),
            )
        })
    }
}

impl ErrorCode {
    /// Convert from u32 error code
    pub fn from_u32(code: u32) -> Option<Self> {
        match code {
            6000 => Some(ErrorCode::InvalidAmount),
            6001 => Some(ErrorCode::InsufficientBalance),
            6002 => Some(ErrorCode::Unauthorized),
            6003 => Some(ErrorCode::InvalidAccount),
            6004 => Some(ErrorCode::AccountNotInitialized),
            6005 => Some(ErrorCode::InvalidAccountOwner),
            6006 => Some(ErrorCode::InsufficientAccountSpace),
            6007 => Some(ErrorCode::AccountAlreadyInitialized),
            6008 => Some(ErrorCode::InvalidTimestamp),
            6009 => Some(ErrorCode::Expired),
            6100 => Some(ErrorCode::MathOverflow),
            6101 => Some(ErrorCode::MathUnderflow),
            6102 => Some(ErrorCode::DivisionByZero),
            6103 => Some(ErrorCode::InvalidPercentage),
            6104 => Some(ErrorCode::ValueTooLow),
            6105 => Some(ErrorCode::ValueTooHigh),
            6200 => Some(ErrorCode::PoolInactive),
            6201 => Some(ErrorCode::AlreadyMigrated),
            6202 => Some(ErrorCode::ThresholdNotMet),
            6203 => Some(ErrorCode::InvalidPoolConfig),
            6204 => Some(ErrorCode::PoolCreationFailed),
            6205 => Some(ErrorCode::PoolNotFound),
            6206 => Some(ErrorCode::InvalidPricingConfig),
            6207 => Some(ErrorCode::PoolPaused),
            6300 => Some(ErrorCode::InvalidNftMint),
            6301 => Some(ErrorCode::InsufficientNftBalance),
            6302 => Some(ErrorCode::NftNotFound),
            6303 => Some(ErrorCode::NftAlreadyExists),
            6304 => Some(ErrorCode::InvalidNftMetadata),
            6305 => Some(ErrorCode::NftTransferFailed),
            6306 => Some(ErrorCode::CannotOperateOnOwnNft),
            6307 => Some(ErrorCode::NftNotOwned),
            6308 => Some(ErrorCode::MaxSupplyReached),
            6400 => Some(ErrorCode::InvalidBidAmount),
            6401 => Some(ErrorCode::BidTooLow),
            6402 => Some(ErrorCode::BidTooHigh),
            6403 => Some(ErrorCode::BidNotFound),
            6404 => Some(ErrorCode::BidAlreadyExists),
            6405 => Some(ErrorCode::BidExpired),
            6406 => Some(ErrorCode::CannotBidOnOwnNft),
            6407 => Some(ErrorCode::BidListingNotActive),
            6408 => Some(ErrorCode::BidListingExpired),
            6409 => Some(ErrorCode::InvalidBidStatus),
            6410 => Some(ErrorCode::InsufficientBidIncrement),
            6411 => Some(ErrorCode::BidMustExceedBondingCurve),
            6412 => Some(ErrorCode::BidBelowBondingCurve),
            6413 => Some(ErrorCode::InsufficientPremium),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_categories() {
        assert_eq!(ErrorCode::InvalidAmount.category(), ErrorCategory::General);
        assert_eq!(ErrorCode::MathOverflow.category(), ErrorCategory::Math);
        assert_eq!(ErrorCode::PoolInactive.category(), ErrorCategory::Pool);
        assert_eq!(ErrorCode::BidTooLow.category(), ErrorCategory::Bidding);
    }

    #[test]
    fn test_error_recoverability() {
        assert!(ErrorCode::BidTooLow.is_recoverable());
        assert!(!ErrorCode::MathOverflow.is_recoverable());
        assert!(!ErrorCode::SystemError.is_recoverable());
    }

    #[test]
    fn test_user_messages() {
        assert!(!ErrorCode::InsufficientBalance.user_message().is_empty());
        assert!(!ErrorCode::BidTooLow.user_message().is_empty());
        assert!(!ErrorCode::CannotBidOnOwnNft.user_message().is_empty());
    }

    #[test]
    fn test_error_code_conversion() {
        assert_eq!(ErrorCode::from_u32(6000), Some(ErrorCode::InvalidAmount));
        assert_eq!(ErrorCode::from_u32(6401), Some(ErrorCode::BidTooLow));
        assert_eq!(ErrorCode::from_u32(9999), None);
    }
}

