use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

/// Account validation utilities
pub struct AccountValidator;

impl AccountValidator {
    /// Validates that an account owns a specific NFT
    pub fn validate_nft_ownership(
        token_account: &Account<TokenAccount>,
        owner: &Pubkey,
        nft_mint: &Pubkey,
    ) -> Result<()> {
        require_keys_eq!(
            token_account.owner,
            *owner,
            crate::errors::ErrorCode::InvalidNftOwner
        );
        
        require_keys_eq!(
            token_account.mint,
            *nft_mint,
            crate::errors::ErrorCode::InvalidNftMint
        );
        
        require!(
            token_account.amount == 1,
            crate::errors::ErrorCode::InsufficientNftBalance
        );

        Ok(())
    }

    /// Validates that a user has sufficient SOL balance
    pub fn validate_sol_balance(
        account: &AccountInfo,
        required_amount: u64,
    ) -> Result<()> {
        require!(
            account.lamports() >= required_amount,
            crate::errors::ErrorCode::InsufficientFunds
        );
        Ok(())
    }

    /// Validates that a timestamp is not expired
    pub fn validate_not_expired(
        expires_at: i64,
        current_time: i64,
    ) -> Result<()> {
        if expires_at > 0 && current_time >= expires_at {
            return Err(crate::errors::ErrorCode::BidExpired.into());
        }
        Ok(())
    }

    /// Validates that a bid amount meets requirements
    pub fn validate_bid_amount(
        bid_amount: u64,
        min_bid: u64,
        current_highest: u64,
    ) -> Result<()> {
        if current_highest > 0 {
            // Must be at least 5% higher than current highest bid
            let min_required = current_highest
                .checked_mul(105)
                .and_then(|x| x.checked_div(100))
                .ok_or(crate::errors::ErrorCode::MathOverflow)?;
            
            require!(
                bid_amount >= min_required,
                crate::errors::ErrorCode::BidTooLow
            );
        } else {
            require!(
                bid_amount >= min_bid,
                crate::errors::ErrorCode::BidTooLow
            );
        }
        Ok(())
    }

    /// Validates that a user is authorized to perform an action
    pub fn validate_authority(
        expected_authority: &Pubkey,
        actual_authority: &Pubkey,
    ) -> Result<()> {
        require_keys_eq!(
            *expected_authority,
            *actual_authority,
            crate::errors::ErrorCode::Unauthorized
        );
        Ok(())
    }
}

/// Business logic validation
pub struct BusinessValidator;

impl BusinessValidator {
    /// Validates that a listing is in the correct state for an operation
    pub fn validate_listing_status(
        status: &crate::state::types::BidListingStatus,
        expected: &crate::state::types::BidListingStatus,
    ) -> Result<()> {
        require!(
            status == expected,
            crate::errors::ErrorCode::InvalidListingStatus
        );
        Ok(())
    }

    /// Validates that a bid is in the correct state for an operation
    pub fn validate_bid_status(
        status: &crate::state::types::BidStatus,
        expected: &crate::state::types::BidStatus,
    ) -> Result<()> {
        require!(
            status == expected,
            crate::errors::ErrorCode::InvalidBidStatus
        );
        Ok(())
    }

    /// Validates that a duration is within acceptable limits
    pub fn validate_duration(duration_hours: Option<u32>) -> Result<i64> {
        match duration_hours {
            Some(hours) => {
                require!(
                    hours >= 1 && hours <= 168, // 1 hour to 1 week
                    crate::errors::ErrorCode::InvalidDuration
                );
                Ok(hours as i64 * 3600) // Convert to seconds
            }
            None => Ok(0), // No expiry
        }
    }

    /// Validates that a collection has enough NFTs for fee distribution
    pub fn validate_collection_for_distribution(
        total_nfts: u32,
        accumulated_fees: u64,
    ) -> Result<()> {
        require!(
            total_nfts > 0,
            crate::errors::ErrorCode::EmptyCollection
        );
        
        require!(
            accumulated_fees > 0,
            crate::errors::ErrorCode::NoFeesToDistribute
        );

        Ok(())
    }
}

/// Math validation utilities
pub struct MathValidator;

impl MathValidator {
    /// Safe addition with overflow check
    pub fn safe_add(a: u64, b: u64) -> Result<u64> {
        a.checked_add(b)
            .ok_or(crate::errors::ErrorCode::MathOverflow.into())
    }

    /// Safe subtraction with underflow check
    pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
        a.checked_sub(b)
            .ok_or(crate::errors::ErrorCode::MathUnderflow.into())
    }

    /// Safe multiplication with overflow check
    pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
        a.checked_mul(b)
            .ok_or(crate::errors::ErrorCode::MathOverflow.into())
    }

    /// Safe division with zero check
    pub fn safe_div(a: u64, b: u64) -> Result<u64> {
        if b == 0 {
            return Err(crate::errors::ErrorCode::DivisionByZero.into());
        }
        Ok(a / b)
    }

    /// Calculate percentage with precision
    pub fn calculate_percentage(amount: u64, percentage: u64) -> Result<u64> {
        Self::safe_mul(amount, percentage)
            .and_then(|result| Self::safe_div(result, 100))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_validation() {
        assert_eq!(MathValidator::safe_add(100, 200).unwrap(), 300);
        assert_eq!(MathValidator::safe_sub(300, 100).unwrap(), 200);
        assert_eq!(MathValidator::safe_mul(10, 20).unwrap(), 200);
        assert_eq!(MathValidator::safe_div(100, 5).unwrap(), 20);
        assert_eq!(MathValidator::calculate_percentage(1000, 95).unwrap(), 950);
    }

    #[test]
    fn test_duration_validation() {
        assert!(BusinessValidator::validate_duration(Some(24)).is_ok());
        assert!(BusinessValidator::validate_duration(Some(0)).is_err());
        assert!(BusinessValidator::validate_duration(Some(200)).is_err());
        assert_eq!(BusinessValidator::validate_duration(None).unwrap(), 0);
    }
}

