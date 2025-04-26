use anchor_lang::prelude::*;

#[account]
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
    pub price_history: [u64; 10],
    pub price_history_idx: u8,
    pub total_burned: u64,
    pub total_distributed: u64,
    pub migrated_to_tensor: bool,
    pub tensor_migration_timestamp: i64,
    pub bump: u8,
}

impl BondingCurvePool {
    pub const SIZE: usize = 8 +  // discriminator
        32 + // authority
        32 + // real_token_mint
        32 + // synthetic_token_mint
        32 + // real_token_vault
        8 + // current_market_cap
        8 + // base_price
        8 + // growth_factor
        8 + // total_supply
        1 + // past_threshold
        80 + // price_history
        1 + // price_history_idx
        8 + // total_burned
        8 + // total_distributed
        1 + // migrated_to_tensor
        8 + // tensor_migration_timestamp
        1; // bump
}
