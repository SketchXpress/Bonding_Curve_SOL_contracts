use anchor_lang::prelude::*;

/// Individual bid state - clean and focused
#[account]
pub struct Bid {
    /// Unique bid identifier
    pub bid_id: u64,
    
    /// Bid details
    pub details: BidDetails,
    
    /// Bid timing
    pub timing: BidTiming,
    
    /// Bid status and outcome
    pub outcome: BidOutcome,
    
    /// PDA bump
    pub bump: u8,
}

impl Bid {
    pub const SIZE: usize = 8 + // discriminator
        8 + // bid_id
        BidDetails::SIZE +
        BidTiming::SIZE +
        BidOutcome::SIZE +
        1; // bump

    /// Check if bid is still valid
    pub fn is_valid(&self) -> bool {
        self.outcome.status == BidStatus::Active &&
        self.timing.expires_at > Clock::get().map(|c| c.unix_timestamp).unwrap_or(0)
    }

    /// Check if bid can be accepted
    pub fn can_accept(&self) -> bool {
        self.is_valid() && self.outcome.status == BidStatus::Active
    }

    /// Check if bid can be cancelled
    pub fn can_cancel(&self, caller: &Pubkey) -> bool {
        self.outcome.status == BidStatus::Active &&
        (self.details.bidder == *caller || self.is_expired())
    }

    /// Check if bid is expired
    pub fn is_expired(&self) -> bool {
        self.timing.expires_at <= Clock::get().map(|c| c.unix_timestamp).unwrap_or(0)
    }
}

/// Bid details - core bid information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BidDetails {
    /// NFT being bid on
    pub nft_mint: Pubkey,
    
    /// Address of the bidder
    pub bidder: Pubkey,
    
    /// Bid amount in lamports
    pub amount: u64,
    
    /// Premium over bonding curve price (basis points)
    pub premium_bp: u16,
}

impl BidDetails {
    pub const SIZE: usize = 
        32 + // nft_mint
        32 + // bidder
        8 + // amount
        2; // premium_bp

    /// Create new bid details
    pub fn new(nft_mint: Pubkey, bidder: Pubkey, amount: u64, bonding_curve_price: u64) -> Result<Self> {
        let premium = amount.checked_sub(bonding_curve_price).unwrap_or(0);
        let premium_bp = if bonding_curve_price > 0 {
            ((premium * 10000) / bonding_curve_price) as u16
        } else {
            0
        };

        Ok(Self {
            nft_mint,
            bidder,
            amount,
            premium_bp,
        })
    }

    /// Validate bid details
    pub fn validate(&self) -> Result<()> {
        require!(self.amount > 0, crate::errors::ErrorCode::InvalidAmount);
        require!(self.nft_mint != Pubkey::default(), crate::errors::ErrorCode::InvalidNftMint);
        require!(self.bidder != Pubkey::default(), crate::errors::ErrorCode::InvalidAccount);
        Ok(())
    }
}

/// Bid timing - when bid was created and expires
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BidTiming {
    /// When bid was created
    pub created_at: i64,
    
    /// When bid expires
    pub expires_at: i64,
    
    /// Duration in seconds
    pub duration: i64,
}

impl BidTiming {
    pub const SIZE: usize = 
        8 + // created_at
        8 + // expires_at
        8; // duration

    /// Create new bid timing
    pub fn new(duration: i64) -> Result<Self> {
        let created_at = Clock::get()?.unix_timestamp;
        let expires_at = created_at.checked_add(duration)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        Ok(Self {
            created_at,
            expires_at,
            duration,
        })
    }

    /// Check if timing is valid
    pub fn validate(&self) -> Result<()> {
        require!(self.duration > 0, crate::errors::ErrorCode::InvalidDuration);
        require!(self.expires_at > self.created_at, crate::errors::ErrorCode::InvalidDuration);
        Ok(())
    }

    /// Get remaining time in seconds
    pub fn remaining_time(&self) -> i64 {
        let current_time = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
        (self.expires_at - current_time).max(0)
    }
}

/// Bid outcome - status and resolution
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BidOutcome {
    /// Current bid status
    pub status: BidStatus,
    
    /// When bid was accepted (if applicable)
    pub accepted_at: Option<i64>,
    
    /// When bid was cancelled (if applicable)
    pub cancelled_at: Option<i64>,
    
    /// Reason for cancellation (if applicable)
    pub cancellation_reason: Option<CancellationReason>,
}

impl BidOutcome {
    pub const SIZE: usize = 
        1 + // status (enum)
        9 + // accepted_at (Option<i64>)
        9 + // cancelled_at (Option<i64>)
        2; // cancellation_reason (Option<enum>)

    /// Create new active bid outcome
    pub fn new_active() -> Self {
        Self {
            status: BidStatus::Active,
            accepted_at: None,
            cancelled_at: None,
            cancellation_reason: None,
        }
    }

    /// Mark bid as accepted
    pub fn accept(&mut self) -> Result<()> {
        require!(self.status == BidStatus::Active, crate::errors::ErrorCode::InvalidAccount);
        
        self.status = BidStatus::Accepted;
        self.accepted_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    /// Mark bid as cancelled
    pub fn cancel(&mut self, reason: CancellationReason) -> Result<()> {
        require!(
            self.status == BidStatus::Active, 
            crate::errors::ErrorCode::InvalidAccount
        );
        
        self.status = BidStatus::Cancelled;
        self.cancelled_at = Some(Clock::get()?.unix_timestamp);
        self.cancellation_reason = Some(reason);
        Ok(())
    }
}

/// Bid status enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum BidStatus {
    Active,
    Accepted,
    Cancelled,
    Expired,
}

/// Cancellation reason enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum CancellationReason {
    UserCancelled,
    Expired,
    ListingCancelled,
    HigherBidAccepted,
    SystemCancelled,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bid_details_creation() {
        let nft_mint = Pubkey::new_unique();
        let bidder = Pubkey::new_unique();
        let amount = 110_000_000; // 0.11 SOL
        let bonding_curve_price = 100_000_000; // 0.1 SOL

        let details = BidDetails::new(nft_mint, bidder, amount, bonding_curve_price).unwrap();
        
        assert_eq!(details.nft_mint, nft_mint);
        assert_eq!(details.bidder, bidder);
        assert_eq!(details.amount, amount);
        assert_eq!(details.premium_bp, 1000); // 10% premium
        assert!(details.validate().is_ok());
    }

    #[test]
    fn test_bid_timing() {
        let duration = 86400; // 24 hours
        let timing = BidTiming::new(duration).unwrap();
        
        assert_eq!(timing.duration, duration);
        assert!(timing.expires_at > timing.created_at);
        assert!(timing.validate().is_ok());
        assert!(timing.remaining_time() > 0);
    }

    #[test]
    fn test_bid_outcome_transitions() {
        let mut outcome = BidOutcome::new_active();
        
        assert_eq!(outcome.status, BidStatus::Active);
        assert!(outcome.accepted_at.is_none());
        
        // Test acceptance
        assert!(outcome.accept().is_ok());
        assert_eq!(outcome.status, BidStatus::Accepted);
        assert!(outcome.accepted_at.is_some());
        
        // Test cancellation (should fail since already accepted)
        let mut outcome2 = BidOutcome::new_active();
        assert!(outcome2.cancel(CancellationReason::UserCancelled).is_ok());
        assert_eq!(outcome2.status, BidStatus::Cancelled);
        assert!(outcome2.cancelled_at.is_some());
        assert_eq!(outcome2.cancellation_reason, Some(CancellationReason::UserCancelled));
    }

    #[test]
    fn test_bid_validation() {
        // Create a mock bid for testing
        let bid_details = BidDetails {
            nft_mint: Pubkey::new_unique(),
            bidder: Pubkey::new_unique(),
            amount: 100_000_000,
            premium_bp: 1000,
        };
        
        let bid_timing = BidTiming {
            created_at: 1000,
            expires_at: 2000,
            duration: 1000,
        };
        
        let bid_outcome = BidOutcome::new_active();
        
        // All validations should pass
        assert!(bid_details.validate().is_ok());
        assert!(bid_timing.validate().is_ok());
    }
}

