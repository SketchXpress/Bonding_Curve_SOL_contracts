use anchor_lang::prelude::*;

#[account]
pub struct BidListing {
    /// The NFT mint being listed for bids
    pub nft_mint: Pubkey,
    /// The current owner of the NFT (who listed it)
    pub lister: Pubkey,
    /// The original minter of the NFT (who will receive 95% of proceeds)
    pub original_minter: Pubkey,
    /// Minimum bid amount in lamports
    pub min_bid: u64,
    /// Current highest bid amount
    pub highest_bid: u64,
    /// Current highest bidder
    pub highest_bidder: Option<Pubkey>,
    /// Status of the listing
    pub status: BidListingStatus,
    /// Timestamp when listing was created
    pub created_at: i64,
    /// Timestamp when listing expires (0 = no expiry)
    pub expires_at: i64,
    /// Bump seed for PDA
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BidListingStatus {
    Active,
    Accepted,
    Cancelled,
    Expired,
}

impl BidListing {
    pub const SPACE: usize = 8 + // discriminator
        32 + // nft_mint
        32 + // lister
        32 + // original_minter
        8 +  // min_bid
        8 +  // highest_bid
        33 + // highest_bidder (Option<Pubkey>)
        1 +  // status
        8 +  // created_at
        8 +  // expires_at
        1;   // bump

    pub fn is_active(&self) -> bool {
        self.status == BidListingStatus::Active
    }

    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        self.expires_at > 0 && current_timestamp > self.expires_at
    }

    pub fn can_accept_bid(&self, current_timestamp: i64) -> bool {
        self.is_active() && !self.is_expired(current_timestamp) && self.highest_bidder.is_some()
    }
}

