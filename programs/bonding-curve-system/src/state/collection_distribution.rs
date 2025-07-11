use anchor_lang::prelude::*;

#[account]
pub struct CollectionDistribution {
    /// The collection this distribution is for
    pub collection: Pubkey,
    /// Total number of NFTs in the collection
    pub total_nfts: u32,
    /// Total accumulated fees for distribution
    pub accumulated_fees: u64,
    /// Last distribution timestamp
    pub last_distribution: i64,
    /// Total amount distributed so far
    pub total_distributed: u64,
    /// Number of distributions made
    pub distribution_count: u32,
    /// Bump seed for PDA
    pub bump: u8,
}

impl CollectionDistribution {
    pub const SPACE: usize = 8 + // discriminator
        32 + // collection
        4 +  // total_nfts
        8 +  // accumulated_fees
        8 +  // last_distribution
        8 +  // total_distributed
        4 +  // distribution_count
        1;   // bump

    pub fn add_fees(&mut self, amount: u64) {
        self.accumulated_fees = self.accumulated_fees.saturating_add(amount);
    }

    pub fn get_per_nft_distribution(&self) -> u64 {
        if self.total_nfts == 0 {
            return 0;
        }
        self.accumulated_fees.saturating_div(self.total_nfts as u64)
    }

    pub fn distribute_fees(&mut self, current_timestamp: i64) -> u64 {
        let per_nft_amount = self.get_per_nft_distribution();
        let total_distributed = per_nft_amount.saturating_mul(self.total_nfts as u64);
        
        self.total_distributed = self.total_distributed.saturating_add(total_distributed);
        self.accumulated_fees = self.accumulated_fees.saturating_sub(total_distributed);
        self.last_distribution = current_timestamp;
        self.distribution_count = self.distribution_count.saturating_add(1);
        
        per_nft_amount
    }

    pub fn increment_nft_count(&mut self) {
        self.total_nfts = self.total_nfts.saturating_add(1);
    }

    pub fn get_collection_share(&self, total_amount: u64) -> u64 {
        // 1% goes to collection distribution
        total_amount.saturating_mul(1).saturating_div(100)
    }
}

