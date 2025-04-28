use anchor_lang::prelude::*;

#[account]
pub struct NftEscrow {
    pub nft_mint: Pubkey,            // Associated NFT
    pub lamports: u64,               // Escrowed SOL value
    pub last_price: u64,             // Price at last action
    pub bump: u8,                    // PDA bump
}

impl NftEscrow {
    // Define the space required for the NftEscrow account
    // 8 (discriminator) + 32 (nft_mint) + 8 (lamports) + 8 (last_price) + 1 (bump)
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 1;
}

