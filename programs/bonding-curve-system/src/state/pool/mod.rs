pub mod config;
pub mod state;
pub mod stats;

pub use config::*;
pub use state::*;
pub use stats::*;

use anchor_lang::prelude::*;

/// Bonding curve pool - main account
#[account]
pub struct BondingCurvePool {
    /// Collection this pool belongs to
    pub collection: Pubkey,
    
    /// Pool configuration
    pub config: PoolConfig,
    
    /// Current pool state
    pub state: PoolState,
    
    /// Pool statistics
    pub stats: PoolStats,
    
    /// PDA bump
    pub bump: u8,
}

impl BondingCurvePool {
    pub const SIZE: usize = 8 + // discriminator
        32 + // collection
        PoolConfig::SIZE +
        PoolState::SIZE +
        PoolStats::SIZE +
        1; // bump

    /// Check if pool is active and can mint
    pub fn can_mint(&self) -> bool {
        self.state.is_active && 
        self.state.current_supply < self.config.max_supply &&
        !self.state.is_migrated
    }

    /// Check if pool should migrate to Tensor
    pub fn should_migrate(&self) -> bool {
        self.stats.market_cap >= self.config.migration_threshold
    }

    /// Get current mint price
    pub fn current_price(&self) -> Result<u64> {
        crate::math::calculate_bonding_curve_price(
            self.config.base_price,
            self.config.growth_factor,
            self.state.current_supply,
        )
    }
}

