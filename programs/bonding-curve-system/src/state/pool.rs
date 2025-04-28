use anchor_lang::prelude::*;

#[account]
pub struct BondingCurvePool {
    // --- Fields from Document --- 
    pub collection: Pubkey,          // Metaplex collection ID
    pub base_price: u64,             // e.g., 0.001 SOL = 1_000_000 lamports
    pub growth_factor: u64,          // Fixed-point (e.g., 1.2 = 120000)
    pub current_supply: u64,         // Total NFTs minted via this pool
    pub protocol_fee: u64,           // Fee storage (e.g., 1% = 10000)
    pub creator: Pubkey,             // Collection creator
    
    // --- Additional Fields based on Document Logic ---
    pub total_escrowed: u64,         // Total SOL held in all associated NftEscrows (for migration)
    pub is_active: bool,             // Flag to freeze the pool for migration
    
    // --- PDA Bump ---
    pub bump: u8,                    // PDA bump for the pool account itself
}

impl BondingCurvePool {
    // Calculate the space required for the BondingCurvePool account
    // 8 (discriminator) + 32 (collection) + 8 (base_price) + 8 (growth_factor) + 
    // 8 (current_supply) + 8 (protocol_fee) + 32 (creator) + 8 (total_escrowed) + 
    // 1 (is_active) + 1 (bump)
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 32 + 8 + 1 + 1;
}

