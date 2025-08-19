use anchor_lang::prelude::*;
use crate::state::{BidAccount, Pool};
use crate::errors::ErrorCode;
use crate::modules::pricing_engine::PricingEngine;

pub struct BidManager;

impl BidManager {
    pub fn create_bid(
        pool: &Pool,
        bid: &mut BidAccount,
        bidder: Pubkey,
        amount: u64,
        nft_mint: Pubkey,
    ) -> Result<()> {
        // Validate bid amount against current price
        let current_price = PricingEngine::calculate_mint_price(pool, pool.current_supply)?;
        let minimum_bid = PricingEngine::calculate_minimum_bid(current_price, pool.bid_premium_percentage)?;
        
        require!(amount >= minimum_bid, ErrorCode::BidTooLow);

        bid.pool = pool.key();
        bid.bidder = bidder;
        bid.amount = amount;
        bid.nft_mint = nft_mint;
        bid.timestamp = Clock::get()?.unix_timestamp;
        bid.active = true;

        Ok(())
    }

    pub fn cancel_bid(bid: &mut BidAccount) -> Result<()> {
        require!(bid.active, ErrorCode::BidNotActive);
        bid.active = false;
        Ok(())
    }

    pub fn accept_bid(
        bid: &mut BidAccount,
        pool: &mut Pool,
    ) -> Result<()> {
        require!(bid.active, ErrorCode::BidNotActive);
        
        // Update pool statistics
        pool.total_volume = pool.total_volume
            .checked_add(bid.amount)
            .ok_or(ErrorCode::MathOverflow)?;
            
        pool.last_sale_price = bid.amount;
        
        // Close the bid
        bid.active = false;
        
        Ok(())
    }

    pub fn get_highest_bid(bids: &[BidAccount]) -> Option<&BidAccount> {
        bids.iter()
            .filter(|bid| bid.active)
            .max_by_key(|bid| bid.amount)
    }
}
