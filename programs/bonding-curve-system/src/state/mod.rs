use anchor_lang::prelude::*;

pub mod pool;
pub mod nft;
pub mod nft_escrow;

pub use pool::*;
pub use nft::*;
// Use explicit imports instead of glob imports to avoid ambiguity
pub use nft_escrow::NftEscrow;

// Add missing UserAccount struct
#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub bump: u8,
    pub owned_nfts: Vec<Pubkey>,
}

impl UserAccount {
    pub const SPACE: usize = 8 + // discriminator
        32 + // owner
        1 +  // bump
        4 + (32 * 50); // owned_nfts vector (up to 50 NFTs)
}
