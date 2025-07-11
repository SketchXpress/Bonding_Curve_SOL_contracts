use anchor_lang::prelude::*;

#[account]
pub struct MinterTracker {
    /// The NFT mint this tracker is for
    pub nft_mint: Pubkey,
    /// The original minter of the NFT
    pub original_minter: Pubkey,
    /// Timestamp when NFT was minted
    pub minted_at: i64,
    /// Collection this NFT belongs to
    pub collection: Pubkey,
    /// Total revenue earned by original minter from this NFT
    pub total_revenue_earned: u64,
    /// Number of times this NFT has been sold via bidding
    pub sale_count: u32,
    /// Bump seed for PDA
    pub bump: u8,
}

impl MinterTracker {
    pub const SPACE: usize = 8 + // discriminator
        32 + // nft_mint
        32 + // original_minter
        8 +  // minted_at
        32 + // collection
        8 +  // total_revenue_earned
        4 +  // sale_count
        1;   // bump

    pub fn add_revenue(&mut self, amount: u64) {
        self.total_revenue_earned = self.total_revenue_earned.saturating_add(amount);
        self.sale_count = self.sale_count.saturating_add(1);
    }

    pub fn get_minter_share(&self, total_amount: u64) -> u64 {
        // 95% goes to original minter
        total_amount.saturating_mul(95).saturating_div(100)
    }
}

