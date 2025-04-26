use anchor_lang::prelude::*;

#[account]
#[repr(C)]  // Use C representation for predictable memory layout
pub struct BondingCurvePool {
    pub authority: Pubkey,
    pub real_token_mint: Pubkey,
    pub synthetic_token_mint: Pubkey,
    pub real_token_vault: Pubkey,
    pub current_market_cap: u64,
    pub base_price: u64,
    pub growth_factor: u64,
    pub total_supply: u64,
    pub past_threshold: bool,
    pub _padding1: [u8; 7],  // Explicit padding after bool
    pub price_history: [u64; 10],
    pub price_history_idx: u8,
    pub _padding2: [u8; 7],  // Explicit padding after u8
    pub total_burned: u64,
    pub total_distributed: u64,
    pub migrated_to_tensor: bool,
    pub _padding3: [u8; 7],  // Explicit padding after bool
    pub tensor_migration_timestamp: i64,
    pub bump: u8,
    pub _padding4: [u8; 7],  // Explicit padding at end
}

impl BondingCurvePool {
    pub const SIZE: usize = 8 +  // discriminator
        32 + 32 + 32 + 32 +  // Pubkeys
        8 + 8 + 8 + 8 +  // u64 fields
        1 + 7 +  // past_threshold + padding
        80 +  // price_history
        1 + 7 +  // price_history_idx + padding
        8 + 8 +  // total_burned, total_distributed
        1 + 7 +  // migrated_to_tensor + padding
        8 +  // tensor_migration_timestamp
        1 + 7;  // bump + padding
}
