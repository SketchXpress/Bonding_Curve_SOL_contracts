use anchor_lang::prelude::*;

#[account]
pub struct NFTData {
    pub creator: Pubkey,
    pub owner: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub collection_id: Pubkey,
    pub is_mutable: bool,
    pub primary_sale_happened: bool,
    pub seller_fee_basis_points: u16,
    pub mint: Pubkey,
    pub last_price: u64,
    pub bump: u8,
}

impl NFTData {
    pub const BASE_SIZE: usize = 8 + // discriminator
        32 + // creator
        32 + // owner
        4 + 32 + // name (max 32 chars)
        4 + 10 + // symbol (max 10 chars)
        4 + 200 + // uri (max 200 chars)
        32 + // collection_id
        1 + // is_mutable
        1 + // primary_sale_happened
        2 + // seller_fee_basis_points
        32 + // mint
        8 + // last_price
        1; // bump
}

#[account]
pub struct NftEscrow {
    pub nft_mint: Pubkey,            // Associated NFT
    pub lamports: u64,               // Escrowed SOL value
    pub last_price: u64,             // Price at last action
    pub bump: u8,                    // PDA bump
}

impl NftEscrow {
    pub const SIZE: usize = 8 + // discriminator
        32 + // nft_mint
        8 +  // lamports
        8 +  // last_price
        1 +  // bump
        8;   // padding/reserved
}
