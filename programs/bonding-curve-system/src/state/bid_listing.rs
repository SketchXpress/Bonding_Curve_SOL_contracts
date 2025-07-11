use anchor_lang::prelude::*;
use crate::state::types::BidListingStatus;

/// Account for managing NFT bid listings with dynamic pricing
#[account]
pub struct BidListing {
    /// The NFT mint being listed for bids
    pub nft_mint: Pubkey,
    
    /// The owner who listed the NFT
    pub lister: Pubkey,
    
    /// Minimum bid amount (dynamically updated based on bonding curve)
    pub min_bid: u64,
    
    /// Current highest bid amount
    pub highest_bid: u64,
    
    /// Pubkey of the highest bidder
    pub highest_bidder: Option<Pubkey>,
    
    /// Total number of bids placed
    pub total_bids: u32,
    
    /// Current status of the listing
    pub status: BidListingStatus,
    
    /// Timestamp when listing was created
    pub created_at: i64,
    
    /// Timestamp when listing expires (0 = no expiry)
    pub expires_at: i64,
    
    /// Last time the minimum bid was updated based on bonding curve
    pub last_price_update: i64,
    
    /// Bonding curve price when the listing was created
    pub bonding_curve_price_at_listing: u64,
    
    /// PDA bump seed
    pub bump: u8,
}

impl BidListing {
    pub const LEN: usize = 8 + // discriminator
        32 + // nft_mint
        32 + // lister
        8 +  // min_bid
        8 +  // highest_bid
        33 + // highest_bidder (Option<Pubkey>)
        4 +  // total_bids
        1 +  // status
        8 +  // created_at
        8 +  // expires_at
        8 +  // last_price_update
        8 +  // bonding_curve_price_at_listing
        1 +  // bump
        32;  // padding for future fields

    /// Check if the listing is still active and not expired
    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == BidListingStatus::Active && 
        (self.expires_at == 0 || current_time < self.expires_at)
    }

    /// Check if the listing has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        self.expires_at > 0 && current_time >= self.expires_at
    }

    /// Get the current minimum bid required (considering bonding curve)
    pub fn get_effective_minimum_bid(&self, current_highest: u64) -> u64 {
        if current_highest > 0 {
            // If there's a highest bid, new bids must be 5% higher
            current_highest
                .checked_mul(105)
                .and_then(|x| x.checked_div(100))
                .unwrap_or(self.min_bid)
        } else {
            self.min_bid
        }
    }

    /// Calculate the premium percentage over bonding curve price
    pub fn calculate_premium_percentage(&self, bid_amount: u64) -> u64 {
        if self.bonding_curve_price_at_listing > 0 {
            bid_amount
                .saturating_sub(self.bonding_curve_price_at_listing)
                .checked_mul(100)
                .and_then(|x| x.checked_div(self.bonding_curve_price_at_listing))
                .unwrap_or(0)
        } else {
            0
        }
    }

    /// Update the minimum bid based on current bonding curve price
    pub fn update_minimum_bid(&mut self, new_bonding_curve_price: u64, premium_percentage: u64, current_time: i64) {
        let new_minimum = new_bonding_curve_price
            .checked_mul(100 + premium_percentage)
            .and_then(|x| x.checked_div(100))
            .unwrap_or(self.min_bid);

        if new_minimum > self.min_bid {
            self.min_bid = new_minimum;
            self.last_price_update = current_time;
        }
    }
}

