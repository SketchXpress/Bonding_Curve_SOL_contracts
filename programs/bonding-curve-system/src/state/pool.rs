use anchor_lang::prelude::*;
// Remove the explicit bytemuck imports as they're not needed with #[account(zero_copy)]

#[account(zero_copy)]
#[derive(Default)]
#[repr(C, packed)]
pub struct BondingCurvePool {
    // Account references
    pub authority: Pubkey,
    pub real_token_mint: Pubkey,
    pub synthetic_token_mint: Pubkey,
    pub real_token_vault: Pubkey,
    
    // Numeric values
    pub current_market_cap: u64,
    pub base_price: u64,
    pub growth_factor: u64,
    pub total_supply: u64,
    
    // Flags byte (replaces individual booleans)
    pub flags: u8,
    
    // Price history index
    pub price_history_idx: u8,
    
    // Bump seed for PDA derivation
    pub bump: u8,
    
    // Reserved space for future upgrades
    pub _reserved: [u8; 5],
    
    // Additional numeric values
    pub total_burned: u64,
    pub total_distributed: u64,
    pub tensor_migration_timestamp: i64,
}

// Flag bit positions
impl BondingCurvePool {
    // Size constant for account allocation
    pub const SIZE: usize = std::mem::size_of::<BondingCurvePool>();
    
    // Flag constants
    pub const PAST_THRESHOLD_FLAG: u8 = 0x01;
    pub const MIGRATED_TO_TENSOR_FLAG: u8 = 0x02;
    
    // Getter methods for flags
    pub fn is_past_threshold(&self) -> bool {
        (self.flags & Self::PAST_THRESHOLD_FLAG) != 0
    }
    
    pub fn is_migrated_to_tensor(&self) -> bool {
        (self.flags & Self::MIGRATED_TO_TENSOR_FLAG) != 0
    }
    
    // Setter methods for flags
    pub fn set_past_threshold(&mut self, value: bool) {
        if value {
            self.flags |= Self::PAST_THRESHOLD_FLAG;
        } else {
            self.flags &= !Self::PAST_THRESHOLD_FLAG;
        }
    }
    
    pub fn set_migrated_to_tensor(&mut self, value: bool) {
        if value {
            self.flags |= Self::MIGRATED_TO_TENSOR_FLAG;
        } else {
            self.flags &= !Self::MIGRATED_TO_TENSOR_FLAG;
        }
    }
}

// Type alias for AccountLoader<BondingCurvePool>
pub type BondingCurvePoolAccount<'info> = AccountLoader<'info, BondingCurvePool>;

// No manual implementations needed - #[account(zero_copy)] handles this automatically
