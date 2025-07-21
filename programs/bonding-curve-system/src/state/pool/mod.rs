pub mod config;
pub mod state;
pub mod stats;

pub use self::config::*;
pub use self::state::*;
pub use self::stats::*;

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
    /// Account size for allocation
    pub const SIZE: usize = 8 + // discriminator
        32 + // collection
        PoolConfig::SIZE +
        PoolState::SIZE +
        PoolStats::SIZE +
        1; // bump

    /// Account space for allocation (alias for SIZE)
    pub const SPACE: usize = Self::SIZE;

    /// Check if pool is active and can mint new NFTs
    /// Returns true if:
    /// - Pool is active
    /// - Supply hasn't reached max
    /// - Not migrated to Tensor
    pub fn can_mint(&self) -> bool {
        self.state.is_active && 
        self.state.current_supply < self.config.max_supply &&
        !self.state.is_migrated
    }

    /// Check if pool has reached migration threshold
    /// Returns true if market cap exceeds migration threshold
    pub fn should_migrate(&self) -> bool {
        self.stats.market_cap >= self.config.migration_threshold
    }

    /// Calculate current mint price based on bonding curve
    pub fn current_price(&self) -> Result<u64> {
        crate::math::calculate_bonding_curve_price(
            self.config.base_price,
            self.config.growth_factor,
            self.state.current_supply,
        )
    }
}

