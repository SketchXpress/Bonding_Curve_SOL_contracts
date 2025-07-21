use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub total_nfts_bought: u64,
    pub total_nfts_sold: u64,
    pub total_volume_bought: u64,
    pub total_volume_sold: u64,
    pub total_fees_paid: u64,
    pub total_fees_earned: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl UserAccount {
    pub const BASE_SIZE: usize = 8 + // discriminator
        32 + // owner
        8 + // total_nfts_bought
        8 + // total_nfts_sold
        8 + // total_volume_bought
        8 + // total_volume_sold
        8 + // total_fees_paid
        8 + // total_fees_earned
        8 + // created_at
        1; // bump
}
