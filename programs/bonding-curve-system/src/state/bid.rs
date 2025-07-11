use anchor_lang::prelude::*;

#[account]
pub struct Bid {
    /// Unique identifier for this bid
    pub bid_id: u64,
    /// The NFT mint this bid is for
    pub nft_mint: Pubkey,
    /// The bidder's wallet
    pub bidder: Pubkey,
    /// Bid amount in lamports
    pub amount: u64,
    /// Status of the bid
    pub status: BidStatus,
    /// Timestamp when bid was placed
    pub created_at: i64,
    /// Timestamp when bid expires (0 = no expiry)
    pub expires_at: i64,
    /// Escrow account holding the bid amount
    pub escrow_account: Pubkey,
    /// Bump seed for PDA
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BidStatus {
    Active,
    Accepted,
    Cancelled,
    Expired,
    Outbid,
}

impl Bid {
    pub const SPACE: usize = 8 + // discriminator
        8 +  // bid_id
        32 + // nft_mint
        32 + // bidder
        8 +  // amount
        1 +  // status
        8 +  // created_at
        8 +  // expires_at
        32 + // escrow_account
        1;   // bump

    pub fn is_active(&self) -> bool {
        self.status == BidStatus::Active
    }

    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        self.expires_at > 0 && current_timestamp > self.expires_at
    }

    pub fn can_be_accepted(&self, current_timestamp: i64) -> bool {
        self.is_active() && !self.is_expired(current_timestamp)
    }

    pub fn can_be_cancelled(&self, current_timestamp: i64) -> bool {
        matches!(self.status, BidStatus::Active | BidStatus::Outbid) && 
        !self.is_expired(current_timestamp)
    }
}

