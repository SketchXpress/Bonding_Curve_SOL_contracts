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
    
    // --- Fields referenced in buy_nft.rs ---
    pub total_distributed: u64,      // Total amount distributed
    pub total_supply: u64,           // Total supply (may differ from current_supply)
    pub current_market_cap: u64,     // Current market cap
    
    // --- Fields referenced in migrate_to_tensor.rs ---
    pub authority: Pubkey,           // Pool authority
    pub tensor_migration_timestamp: i64, // Timestamp of migration to Tensor
    pub is_migrated_to_tensor: bool, // Flag indicating if migrated to Tensor
    pub is_past_threshold: bool,     // Flag indicating if past threshold
    
    // --- PDA Bump ---
    pub bump: u8,                    // PDA bump for the pool account itself
}

impl BondingCurvePool {
    // Calculate the space required for the BondingCurvePool account
    // 8 (discriminator) + 32 (collection) + 8 (base_price) + 8 (growth_factor) + 
    // 8 (current_supply) + 8 (protocol_fee) + 32 (creator) + 8 (total_escrowed) + 
    // 1 (is_active) + 8 (total_distributed) + 8 (total_supply) + 8 (current_market_cap) +
    // 32 (authority) + 8 (tensor_migration_timestamp) + 1 (is_migrated_to_tensor) + 
    // 1 (is_past_threshold) + 1 (bump)
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 32 + 8 + 1 + 8 + 8 + 8 + 32 + 8 + 1 + 1 + 1;
    
    // Methods referenced in migrate_to_tensor.rs
    pub fn is_migrated_to_tensor(&self) -> bool {
        self.is_migrated_to_tensor
    }
    
    pub fn set_migrated_to_tensor(&mut self, value: bool) {
        self.is_migrated_to_tensor = value;
    }
    
    // Methods referenced in buy_nft.rs
    pub fn is_past_threshold(&self) -> bool {
        self.is_past_threshold
    }
    
    pub fn set_past_threshold(&mut self, value: bool) {
        self.is_past_threshold = value;
    }
}
