use anchor_lang::prelude::*;

pub mod pool;
pub mod nft;
pub mod nft_escrow;
pub mod bid_listing;
pub mod bid;
pub mod minter_tracker;
pub mod collection_distribution;

pub use pool::*;
pub use nft::*;
// Use explicit imports instead of glob imports to avoid ambiguity
pub use nft_escrow::NftEscrow;
pub use bid_listing::*;
pub use bid::*;
pub use minter_tracker::*;
pub use collection_distribution::*;

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
