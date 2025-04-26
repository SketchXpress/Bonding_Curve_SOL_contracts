use anchor_lang::prelude::*;

// Simplified BondingCurvePool struct with minimal fields
// Removed price_history array and consolidated padding
#[account]
#[repr(C)]
pub struct BondingCurvePool {
    pub authority: Pubkey,
    pub real_token_mint: Pubkey,
    pub synthetic_token_mint: Pubkey,
    pub real_token_vault: Pubkey,
    pub current_market_cap: u64,
    pub base_price: u64,
    pub growth_factor: u64,
    pub total_supply: u64,
    // Combine boolean fields to reduce padding needs
    pub flags: u8, // bit 0: past_threshold, bit 1: migrated_to_tensor
    pub price_history_idx: u8,
    pub bump: u8,
    pub _reserved: [u8; 5], // Single padding field
    // Removed price_history array - will be initialized separately if needed
    pub total_burned: u64,
    pub total_distributed: u64,
    pub tensor_migration_timestamp: i64,
}

impl BondingCurvePool {
    // Flag bit positions
    pub const PAST_THRESHOLD_FLAG: u8 = 0x01;
    pub const MIGRATED_TO_TENSOR_FLAG: u8 = 0x02;
    
    // Getter and setter methods for flags
    pub fn is_past_threshold(&self) -> bool {
        (self.flags & Self::PAST_THRESHOLD_FLAG) != 0
    }
    
    pub fn set_past_threshold(&mut self, value: bool) {
        if value {
            self.flags |= Self::PAST_THRESHOLD_FLAG;
        } else {
            self.flags &= !Self::PAST_THRESHOLD_FLAG;
        }
    }
    
    pub fn is_migrated_to_tensor(&self) -> bool {
        (self.flags & Self::MIGRATED_TO_TENSOR_FLAG) != 0
    }
    
    pub fn set_migrated_to_tensor(&mut self, value: bool) {
        if value {
            self.flags |= Self::MIGRATED_TO_TENSOR_FLAG;
        } else {
            self.flags &= !Self::MIGRATED_TO_TENSOR_FLAG;
        }
    }
    
    // Reduced size without the large price_history array
    pub const SIZE: usize = 8 +  // discriminator
        32 + // authority
        32 + // real_token_mint
        32 + // synthetic_token_mint
        32 + // real_token_vault
        8 + // current_market_cap
        8 + // base_price
        8 + // growth_factor
        8 + // total_supply
        1 + // flags (combined boolean fields)
        1 + // price_history_idx
        1 + // bump
        5 + // _reserved padding
        8 + // total_burned
        8 + // total_distributed
        8; // tensor_migration_timestamp
}
