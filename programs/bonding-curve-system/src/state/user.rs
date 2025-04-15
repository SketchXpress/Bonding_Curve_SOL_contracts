use anchor_lang::prelude::*;

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub real_sol_balance: u64,
    pub synthetic_sol_balance: u64,
    pub owned_nfts: Vec<Pubkey>,
    pub bump: u8,
}

impl UserAccount {
    pub const BASE_SIZE: usize = 8 + // discriminator
        32 + // owner
        8 + // real_sol_balance
        8 + // synthetic_sol_balance
        4 + // vec length prefix
        1; // bump
    
    pub fn space(max_nfts: usize) -> usize {
        Self::BASE_SIZE + (max_nfts * 32) // Each NFT is a pubkey (32 bytes)
    }
}
