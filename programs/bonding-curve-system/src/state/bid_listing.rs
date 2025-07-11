use anchor_lang::prelude::*;
use crate::state::types::{BidListingStatus, DynamicPricingConfig};

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
    
    /// Current bonding curve price (updated periodically)
    pub current_bonding_curve_price: u64,
    
    /// Premium percentage required above bonding curve (basis points)
    pub required_premium_bp: u16,
    
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
        8 +  // current_bonding_curve_price
        2 +  // required_premium_bp
        1 +  // bump
        32;  // padding for future fields

    /// Initialize a new bid listing
    pub fn initialize(
        &mut self,
        nft_mint: Pubkey,
        lister: Pubkey,
        user_min_bid: u64,
        bonding_curve_price: u64,
        pricing_config: &DynamicPricingConfig,
        current_time: i64,
        duration: Option<i64>,
        bump: u8,
    ) -> Result<()> {
        // Calculate dynamic minimum bid
        let premium = (bonding_curve_price as u128)
            .checked_mul(pricing_config.minimum_premium_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let dynamic_minimum = bonding_curve_price
            .checked_add(premium)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        // Use the higher of user's minimum or dynamic minimum
        let effective_min_bid = std::cmp::max(user_min_bid, dynamic_minimum);

        // Validate that minimum bid exceeds bonding curve price
        require!(
            effective_min_bid >= bonding_curve_price,
            crate::errors::ErrorCode::BidMustExceedBondingCurve
        );

        // Set expiry
        let expires_at = match duration {
            Some(d) => {
                require!(
                    d >= pricing_config.min_bid_duration && d <= pricing_config.max_bid_duration,
                    crate::errors::ErrorCode::InvalidDuration
                );
                current_time + d
            }
            None => 0, // No expiry
        };

        self.nft_mint = nft_mint;
        self.lister = lister;
        self.min_bid = effective_min_bid;
        self.highest_bid = 0;
        self.highest_bidder = None;
        self.total_bids = 0;
        self.status = BidListingStatus::Active;
        self.created_at = current_time;
        self.expires_at = expires_at;
        self.last_price_update = current_time;
        self.bonding_curve_price_at_listing = bonding_curve_price;
        self.current_bonding_curve_price = bonding_curve_price;
        self.required_premium_bp = pricing_config.minimum_premium_bp;
        self.bump = bump;

        Ok(())
    }

    /// Check if the listing is still active and not expired
    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == BidListingStatus::Active && 
        (self.expires_at == 0 || current_time < self.expires_at)
    }

    /// Check if the listing has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        self.expires_at > 0 && current_time >= self.expires_at
    }

    /// Get the current minimum bid required
    pub fn get_effective_minimum_bid(&self, pricing_config: &DynamicPricingConfig) -> u64 {
        if self.highest_bid > 0 {
            // If there's a highest bid, new bids must be higher by increment percentage
            let increment = (self.highest_bid as u128)
                .checked_mul(pricing_config.bid_increment_bp as u128)
                .and_then(|x| x.checked_div(10000))
                .and_then(|x| u64::try_from(x).ok())
                .unwrap_or(0);

            self.highest_bid
                .checked_add(increment)
                .unwrap_or(self.min_bid)
        } else {
            self.min_bid
        }
    }

    /// Calculate the premium percentage over bonding curve price
    pub fn calculate_premium_percentage(&self, bid_amount: u64) -> u64 {
        if self.current_bonding_curve_price > 0 {
            bid_amount
                .saturating_sub(self.current_bonding_curve_price)
                .checked_mul(10000) // Convert to basis points
                .and_then(|x| x.checked_div(self.current_bonding_curve_price))
                .unwrap_or(0)
        } else {
            0
        }
    }

    /// Update the minimum bid based on current bonding curve price
    pub fn update_minimum_bid(
        &mut self, 
        new_bonding_curve_price: u64, 
        pricing_config: &DynamicPricingConfig,
        current_time: i64
    ) -> Result<()> {
        let premium = (new_bonding_curve_price as u128)
            .checked_mul(pricing_config.minimum_premium_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        let new_minimum = new_bonding_curve_price
            .checked_add(premium)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        // Only update if the new minimum is higher
        if new_minimum > self.min_bid {
            self.min_bid = new_minimum;
            self.last_price_update = current_time;
        }

        self.current_bonding_curve_price = new_bonding_curve_price;
        Ok(())
    }

    /// Place a new bid on this listing
    pub fn place_bid(
        &mut self,
        bidder: Pubkey,
        amount: u64,
        pricing_config: &DynamicPricingConfig,
        current_time: i64,
    ) -> Result<()> {
        // Validate listing is active
        require!(self.is_active(current_time), crate::errors::ErrorCode::BidListingExpired);

        // Validate bid amount
        let required_minimum = self.get_effective_minimum_bid(pricing_config);
        require!(amount >= required_minimum, crate::errors::ErrorCode::BidTooLow);

        // Validate bid exceeds bonding curve price
        require!(
            amount >= self.current_bonding_curve_price,
            crate::errors::ErrorCode::BidBelowBondingCurve
        );

        // Update highest bid if this is higher
        if amount > self.highest_bid {
            self.highest_bid = amount;
            self.highest_bidder = Some(bidder);
        }

        self.total_bids = self.total_bids
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        Ok(())
    }

    /// Accept a bid and mark listing as accepted
    pub fn accept_bid(&mut self, accepted_amount: u64, current_time: i64) -> Result<()> {
        require!(self.status == BidListingStatus::Active, crate::errors::ErrorCode::InvalidListingStatus);
        require!(accepted_amount == self.highest_bid, crate::errors::ErrorCode::InvalidBidAmount);
        require!(self.highest_bidder.is_some(), crate::errors::ErrorCode::BidNotFound);

        self.status = BidListingStatus::Accepted;
        Ok(())
    }

    /// Cancel the listing
    pub fn cancel(&mut self, current_time: i64) -> Result<()> {
        require!(self.status == BidListingStatus::Active, crate::errors::ErrorCode::InvalidListingStatus);
        self.status = BidListingStatus::Cancelled;
        Ok(())
    }

    /// Mark listing as expired
    pub fn expire(&mut self, current_time: i64) -> Result<()> {
        require!(self.is_expired(current_time), crate::errors::ErrorCode::ListingExpired);
        self.status = BidListingStatus::Expired;
        Ok(())
    }

    /// Get listing statistics
    pub fn get_stats(&self, current_time: i64) -> ListingStats {
        ListingStats {
            nft_mint: self.nft_mint,
            lister: self.lister,
            min_bid: self.min_bid,
            highest_bid: self.highest_bid,
            highest_bidder: self.highest_bidder,
            total_bids: self.total_bids,
            status: self.status.clone(),
            is_active: self.is_active(current_time),
            is_expired: self.is_expired(current_time),
            time_remaining: if self.expires_at > 0 {
                Some(self.expires_at.saturating_sub(current_time))
            } else {
                None
            },
            premium_percentage: if self.highest_bid > 0 {
                self.calculate_premium_percentage(self.highest_bid)
            } else {
                self.calculate_premium_percentage(self.min_bid)
            },
            bonding_curve_price: self.current_bonding_curve_price,
        }
    }
}

/// Listing statistics for frontend display
#[derive(Debug, Clone)]
pub struct ListingStats {
    pub nft_mint: Pubkey,
    pub lister: Pubkey,
    pub min_bid: u64,
    pub highest_bid: u64,
    pub highest_bidder: Option<Pubkey>,
    pub total_bids: u32,
    pub status: BidListingStatus,
    pub is_active: bool,
    pub is_expired: bool,
    pub time_remaining: Option<i64>,
    pub premium_percentage: u64,
    pub bonding_curve_price: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::types::DynamicPricingConfig;

    fn create_test_listing() -> BidListing {
        BidListing {
            nft_mint: Pubkey::default(),
            lister: Pubkey::default(),
            min_bid: 1_100_000_000, // 1.1 SOL
            highest_bid: 0,
            highest_bidder: None,
            total_bids: 0,
            status: BidListingStatus::Active,
            created_at: 1000,
            expires_at: 2000,
            last_price_update: 1000,
            bonding_curve_price_at_listing: 1_000_000_000, // 1 SOL
            current_bonding_curve_price: 1_000_000_000,
            required_premium_bp: 1000, // 10%
            bump: 255,
        }
    }

    #[test]
    fn test_listing_is_active() {
        let listing = create_test_listing();
        assert!(listing.is_active(1500)); // Before expiry
        assert!(!listing.is_active(2500)); // After expiry
    }

    #[test]
    fn test_place_bid() {
        let mut listing = create_test_listing();
        let config = DynamicPricingConfig::default();
        
        listing.place_bid(
            Pubkey::default(),
            1_200_000_000, // 1.2 SOL
            &config,
            1500,
        ).unwrap();
        
        assert_eq!(listing.highest_bid, 1_200_000_000);
        assert_eq!(listing.total_bids, 1);
    }

    #[test]
    fn test_premium_calculation() {
        let listing = create_test_listing();
        let premium = listing.calculate_premium_percentage(1_200_000_000); // 1.2 SOL bid
        assert_eq!(premium, 2000); // 20% premium (in basis points)
    }
}

