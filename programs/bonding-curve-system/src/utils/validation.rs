use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::errors::ErrorCode;

/// Account validation utilities
pub struct AccountValidator;

impl AccountValidator {
    /// Validate that an account has sufficient SOL balance
    /// 
    /// # Arguments
    /// * `account` - Account to check
    /// * `required_amount` - Required amount in lamports
    /// 
    /// # Returns
    /// * `Result<()>` - Success or insufficient balance error
    pub fn validate_sol_balance(account: &AccountInfo, required_amount: u64) -> Result<()> {
        require!(
            account.lamports() >= required_amount,
            ErrorCode::InsufficientBalance
        );
        Ok(())
    }

    /// Validate NFT ownership
    /// 
    /// # Arguments
    /// * `token_account` - Token account to check
    /// * `owner` - Expected owner
    /// * `mint` - Expected mint
    /// 
    /// # Returns
    /// * `Result<()>` - Success or ownership error
    pub fn validate_nft_ownership(
        token_account: &Account<TokenAccount>,
        owner: &Pubkey,
        mint: &Pubkey,
    ) -> Result<()> {
        require_keys_eq!(token_account.owner, *owner, ErrorCode::Unauthorized);
        require_keys_eq!(token_account.mint, *mint, ErrorCode::InvalidAccount);
        require_eq!(token_account.amount, 1, ErrorCode::InsufficientNftBalance);
        Ok(())
    }

    /// Validate that an account is not expired
    /// 
    /// # Arguments
    /// * `expires_at` - Expiration timestamp (0 = no expiry)
    /// * `current_time` - Current timestamp
    /// 
    /// # Returns
    /// * `Result<()>` - Success or expired error
    pub fn validate_not_expired(expires_at: i64, current_time: i64) -> Result<()> {
        if expires_at > 0 {
            require!(current_time < expires_at, ErrorCode::Expired);
        }
        Ok(())
    }

    /// Validate that a signer is authorized for an operation
    /// 
    /// # Arguments
    /// * `signer` - Signer to validate
    /// * `expected` - Expected authorized pubkey
    /// 
    /// # Returns
    /// * `Result<()>` - Success or unauthorized error
    pub fn validate_authority(signer: &Signer, expected: &Pubkey) -> Result<()> {
        require_keys_eq!(signer.key(), *expected, ErrorCode::Unauthorized);
        Ok(())
    }

    /// Validate that an account is properly initialized
    /// 
    /// # Arguments
    /// * `account` - Account to check
    /// 
    /// # Returns
    /// * `Result<()>` - Success or uninitialized error
    pub fn validate_initialized(account: &AccountInfo) -> Result<()> {
        require!(!account.data_is_empty(), ErrorCode::AccountNotInitialized);
        Ok(())
    }

    /// Validate that an account has the expected owner
    /// 
    /// # Arguments
    /// * `account` - Account to check
    /// * `expected_owner` - Expected owner program
    /// 
    /// # Returns
    /// * `Result<()>` - Success or wrong owner error
    pub fn validate_account_owner(account: &AccountInfo, expected_owner: &Pubkey) -> Result<()> {
        require_keys_eq!(account.owner, *expected_owner, ErrorCode::InvalidAccountOwner);
        Ok(())
    }

    /// Validate that an account has sufficient space
    /// 
    /// # Arguments
    /// * `account` - Account to check
    /// * `required_space` - Required space in bytes
    /// 
    /// # Returns
    /// * `Result<()>` - Success or insufficient space error
    pub fn validate_account_space(account: &AccountInfo, required_space: usize) -> Result<()> {
        require!(
            account.data_len() >= required_space,
            ErrorCode::InsufficientAccountSpace
        );
        Ok(())
    }
}

/// Business logic validation utilities
pub struct BusinessValidator;

impl BusinessValidator {
    /// Validate bid amount constraints
    /// 
    /// # Arguments
    /// * `amount` - Bid amount to validate
    /// * `min_amount` - Minimum allowed amount
    /// * `max_amount` - Maximum allowed amount
    /// 
    /// # Returns
    /// * `Result<()>` - Success or invalid amount error
    pub fn validate_bid_amount(
        amount: u64,
        min_amount: u64,
        max_amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidBidAmount);
        require!(amount >= min_amount, ErrorCode::BidTooLow);
        require!(amount <= max_amount, ErrorCode::BidTooHigh);
        Ok(())
    }

    /// Validate duration in seconds
    /// 
    /// # Arguments
    /// * `duration_seconds` - Duration to validate
    /// 
    /// # Returns
    /// * `Result<i64>` - Validated duration or error
    pub fn validate_duration_seconds(duration_seconds: Option<i64>) -> Result<i64> {
        match duration_seconds {
            Some(duration) => {
                require!(duration > 0, ErrorCode::InvalidDuration);
                require!(
                    duration >= 3600, // Minimum 1 hour
                    ErrorCode::DurationTooShort
                );
                require!(
                    duration <= 604800, // Maximum 1 week
                    ErrorCode::DurationTooLong
                );
                Ok(duration)
            }
            None => Ok(0), // No expiry
        }
    }

    /// Validate percentage in basis points
    /// 
    /// # Arguments
    /// * `percentage_bp` - Percentage in basis points
    /// * `max_bp` - Maximum allowed basis points
    /// 
    /// # Returns
    /// * `Result<()>` - Success or invalid percentage error
    pub fn validate_percentage_bp(percentage_bp: u16, max_bp: u16) -> Result<()> {
        require!(
            percentage_bp <= max_bp,
            ErrorCode::InvalidPercentage
        );
        Ok(())
    }

    /// Validate that a listing is in the correct status for an operation
    /// 
    /// # Arguments
    /// * `current_status` - Current listing status
    /// * `required_status` - Required status for operation
    /// 
    /// # Returns
    /// * `Result<()>` - Success or invalid status error
    pub fn validate_listing_status<T: PartialEq>(
        current_status: &T,
        required_status: &T,
    ) -> Result<()> {
        require!(
            current_status == required_status,
            ErrorCode::InvalidListingStatus
        );
        Ok(())
    }

    /// Validate that a bid increment is sufficient
    /// 
    /// # Arguments
    /// * `new_bid` - New bid amount
    /// * `current_highest` - Current highest bid
    /// * `increment_bp` - Required increment in basis points
    /// 
    /// # Returns
    /// * `Result<()>` - Success or insufficient increment error
    pub fn validate_bid_increment(
        new_bid: u64,
        current_highest: u64,
        increment_bp: u16,
    ) -> Result<()> {
        if current_highest == 0 {
            return Ok(()); // No previous bid
        }

        let required_increment = (current_highest as u128)
            .checked_mul(increment_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(ErrorCode::MathOverflow)?;

        let minimum_bid = current_highest
            .checked_add(required_increment)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(new_bid >= minimum_bid, ErrorCode::InsufficientBidIncrement);
        Ok(())
    }

    /// Validate that a premium is sufficient above a base price
    /// 
    /// # Arguments
    /// * `bid_amount` - Bid amount
    /// * `base_price` - Base price (e.g., bonding curve price)
    /// * `minimum_premium_bp` - Minimum premium in basis points
    /// 
    /// # Returns
    /// * `Result<()>` - Success or insufficient premium error
    pub fn validate_premium(
        bid_amount: u64,
        base_price: u64,
        minimum_premium_bp: u16,
    ) -> Result<()> {
        let required_premium = (base_price as u128)
            .checked_mul(minimum_premium_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(ErrorCode::MathOverflow)?;

        let minimum_bid = base_price
            .checked_add(required_premium)
            .ok_or(ErrorCode::MathOverflow)?;

        require!(bid_amount >= minimum_bid, ErrorCode::InsufficientPremium);
        Ok(())
    }

    /// Validate collection size constraints
    /// 
    /// # Arguments
    /// * `current_supply` - Current supply
    /// * `max_supply` - Maximum allowed supply
    /// 
    /// # Returns
    /// * `Result<()>` - Success or supply exceeded error
    pub fn validate_supply_limit(current_supply: u32, max_supply: u32) -> Result<()> {
        require!(current_supply < max_supply, ErrorCode::MaxSupplyReached);
        Ok(())
    }

    /// Validate that a timestamp is in the future
    /// 
    /// # Arguments
    /// * `timestamp` - Timestamp to validate
    /// * `current_time` - Current timestamp
    /// 
    /// # Returns
    /// * `Result<()>` - Success or invalid timestamp error
    pub fn validate_future_timestamp(timestamp: i64, current_time: i64) -> Result<()> {
        require!(timestamp > current_time, ErrorCode::InvalidTimestamp);
        Ok(())
    }

    /// Validate that a string is not empty and within length limits
    /// 
    /// # Arguments
    /// * `text` - String to validate
    /// * `max_length` - Maximum allowed length
    /// 
    /// # Returns
    /// * `Result<()>` - Success or invalid string error
    pub fn validate_string(text: &str, max_length: usize) -> Result<()> {
        require!(!text.is_empty(), ErrorCode::EmptyString);
        require!(text.len() <= max_length, ErrorCode::StringTooLong);
        Ok(())
    }
}

/// Math validation utilities
pub struct MathValidator;

impl MathValidator {
    /// Validate that an addition won't overflow
    /// 
    /// # Arguments
    /// * `a` - First number
    /// * `b` - Second number
    /// 
    /// # Returns
    /// * `Result<u64>` - Sum or overflow error
    pub fn safe_add(a: u64, b: u64) -> Result<u64> {
        a.checked_add(b).ok_or(ErrorCode::MathOverflow.into())
    }

    /// Validate that a subtraction won't underflow
    /// 
    /// # Arguments
    /// * `a` - First number
    /// * `b` - Second number
    /// 
    /// # Returns
    /// * `Result<u64>` - Difference or underflow error
    pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
        a.checked_sub(b).ok_or(ErrorCode::MathUnderflow.into())
    }

    /// Validate that a multiplication won't overflow
    /// 
    /// # Arguments
    /// * `a` - First number
    /// * `b` - Second number
    /// 
    /// # Returns
    /// * `Result<u64>` - Product or overflow error
    pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
        a.checked_mul(b).ok_or(ErrorCode::MathOverflow.into())
    }

    /// Validate that a division won't cause division by zero
    /// 
    /// # Arguments
    /// * `a` - Dividend
    /// * `b` - Divisor
    /// 
    /// # Returns
    /// * `Result<u64>` - Quotient or division by zero error
    pub fn safe_div(a: u64, b: u64) -> Result<u64> {
        require!(b > 0, ErrorCode::DivisionByZero);
        Ok(a / b)
    }

    /// Calculate percentage with overflow protection
    /// 
    /// # Arguments
    /// * `amount` - Amount to calculate percentage of
    /// * `percentage_bp` - Percentage in basis points
    /// 
    /// # Returns
    /// * `Result<u64>` - Calculated percentage or overflow error
    pub fn calculate_percentage(amount: u64, percentage_bp: u16) -> Result<u64> {
        (amount as u128)
            .checked_mul(percentage_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(ErrorCode::MathOverflow.into())
    }

    /// Validate that a number is within a range
    /// 
    /// # Arguments
    /// * `value` - Value to check
    /// * `min` - Minimum allowed value
    /// * `max` - Maximum allowed value
    /// 
    /// # Returns
    /// * `Result<()>` - Success or out of range error
    pub fn validate_range(value: u64, min: u64, max: u64) -> Result<()> {
        require!(value >= min, ErrorCode::ValueTooLow);
        require!(value <= max, ErrorCode::ValueTooHigh);
        Ok(())
    }
}

/// Comprehensive validation result
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub error_code: Option<ErrorCode>,
    pub error_message: Option<String>,
}

impl ValidationResult {
    pub fn success() -> Self {
        Self {
            is_valid: true,
            error_code: None,
            error_message: None,
        }
    }

    pub fn error(code: ErrorCode, message: String) -> Self {
        Self {
            is_valid: false,
            error_code: Some(code),
            error_message: Some(message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_bid_amount() {
        // Valid bid
        assert!(BusinessValidator::validate_bid_amount(
            1_000_000_000, // 1 SOL
            500_000_000,   // 0.5 SOL min
            2_000_000_000, // 2 SOL max
        ).is_ok());

        // Too low
        assert!(BusinessValidator::validate_bid_amount(
            100_000_000,   // 0.1 SOL
            500_000_000,   // 0.5 SOL min
            2_000_000_000, // 2 SOL max
        ).is_err());

        // Too high
        assert!(BusinessValidator::validate_bid_amount(
            3_000_000_000, // 3 SOL
            500_000_000,   // 0.5 SOL min
            2_000_000_000, // 2 SOL max
        ).is_err());
    }

    #[test]
    fn test_validate_duration() {
        // Valid duration
        assert_eq!(
            BusinessValidator::validate_duration_seconds(Some(7200)).unwrap(),
            7200
        );

        // No duration
        assert_eq!(
            BusinessValidator::validate_duration_seconds(None).unwrap(),
            0
        );

        // Too short
        assert!(BusinessValidator::validate_duration_seconds(Some(1800)).is_err());

        // Too long
        assert!(BusinessValidator::validate_duration_seconds(Some(700000)).is_err());
    }

    #[test]
    fn test_safe_math() {
        // Safe addition
        assert_eq!(MathValidator::safe_add(100, 200).unwrap(), 300);

        // Safe subtraction
        assert_eq!(MathValidator::safe_sub(200, 100).unwrap(), 100);

        // Underflow
        assert!(MathValidator::safe_sub(100, 200).is_err());

        // Safe multiplication
        assert_eq!(MathValidator::safe_mul(100, 200).unwrap(), 20000);

        // Safe division
        assert_eq!(MathValidator::safe_div(200, 100).unwrap(), 2);

        // Division by zero
        assert!(MathValidator::safe_div(200, 0).is_err());
    }

    #[test]
    fn test_calculate_percentage() {
        // 10% of 1000
        assert_eq!(MathValidator::calculate_percentage(1000, 1000).unwrap(), 100);

        // 50% of 2000
        assert_eq!(MathValidator::calculate_percentage(2000, 5000).unwrap(), 1000);

        // 100% of 500
        assert_eq!(MathValidator::calculate_percentage(500, 10000).unwrap(), 500);
    }
}

