use anchor_lang::prelude::*;

/// Bonding curve pool state - simplified and focused
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

/// Pool configuration - immutable settings
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PoolConfig {
    /// Starting price in lamports
    pub base_price: u64,
    
    /// Growth factor (basis points)
    pub growth_factor: u16,
    
    /// Maximum supply
    pub max_supply: u32,
    
    /// Market cap threshold for migration
    pub migration_threshold: u64,
    
    /// Creator of the pool
    pub creator: Pubkey,
}

impl PoolConfig {
    pub const SIZE: usize = 
        8 + // base_price
        2 + // growth_factor
        4 + // max_supply
        8 + // migration_threshold
        32; // creator

    /// Validate configuration parameters
    pub fn validate(&self) -> Result<()> {
        require!(self.base_price > 0, crate::errors::ErrorCode::InvalidAmount);
        require!(self.growth_factor > 10000, crate::errors::ErrorCode::InvalidAmount); // Must be > 100%
        require!(self.max_supply > 0, crate::errors::ErrorCode::InvalidAmount);
        require!(self.migration_threshold > 0, crate::errors::ErrorCode::InvalidAmount);
        Ok(())
    }
}

/// Pool state - mutable state
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PoolState {
    /// Whether pool is active
    pub is_active: bool,
    
    /// Current supply of NFTs
    pub current_supply: u32,
    
    /// Whether migrated to Tensor
    pub is_migrated: bool,
    
    /// Migration timestamp
    pub migrated_at: Option<i64>,
    
    /// Pool creation timestamp
    pub created_at: i64,
}

impl PoolState {
    pub const SIZE: usize = 
        1 + // is_active
        4 + // current_supply
        1 + // is_migrated
        9 + // migrated_at (Option<i64>)
        8; // created_at

    /// Initialize new pool state
    pub fn new() -> Self {
        Self {
            is_active: true,
            current_supply: 0,
            is_migrated: false,
            migrated_at: None,
            created_at: Clock::get().map(|c| c.unix_timestamp).unwrap_or(0),
        }
    }

    /// Increment supply after mint
    pub fn increment_supply(&mut self) -> Result<()> {
        self.current_supply = self.current_supply
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        Ok(())
    }

    /// Mark as migrated
    pub fn migrate(&mut self) -> Result<()> {
        self.is_migrated = true;
        self.migrated_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }
}

/// Pool statistics - tracking metrics
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PoolStats {
    /// Total SOL escrowed
    pub total_escrowed: u64,
    
    /// Total volume traded
    pub total_volume: u64,
    
    /// Current market cap
    pub market_cap: u64,
    
    /// Total number of trades
    pub total_trades: u32,
    
    /// Last trade timestamp
    pub last_trade_at: Option<i64>,
}

impl PoolStats {
    pub const SIZE: usize = 
        8 + // total_escrowed
        8 + // total_volume
        8 + // market_cap
        4 + // total_trades
        9; // last_trade_at (Option<i64>)

    /// Initialize new pool stats
    pub fn new() -> Self {
        Self {
            total_escrowed: 0,
            total_volume: 0,
            market_cap: 0,
            total_trades: 0,
            last_trade_at: None,
        }
    }

    /// Update stats after mint
    pub fn record_mint(&mut self, price: u64, escrow_amount: u64) -> Result<()> {
        self.total_escrowed = self.total_escrowed
            .checked_add(escrow_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.total_volume = self.total_volume
            .checked_add(price)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.total_trades = self.total_trades
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.last_trade_at = Some(Clock::get()?.unix_timestamp);
        
        // Update market cap (simplified calculation)
        self.market_cap = self.total_volume;
        
        Ok(())
    }

    /// Update stats after trade
    pub fn record_trade(&mut self, amount: u64) -> Result<()> {
        self.total_volume = self.total_volume
            .checked_add(amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.total_trades = self.total_trades
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.last_trade_at = Some(Clock::get()?.unix_timestamp);
        
        // Update market cap
        self.market_cap = self.total_volume;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_config_validation() {
        let valid_config = PoolConfig {
            base_price: 100_000_000, // 0.1 SOL
            growth_factor: 11000, // 110% (10% growth)
            max_supply: 1000,
            migration_threshold: 690_000_000_000, // 690 SOL
            creator: Pubkey::default(),
        };
        
        assert!(valid_config.validate().is_ok());
        
        let invalid_config = PoolConfig {
            base_price: 0, // Invalid
            growth_factor: 5000, // Too low
            max_supply: 0, // Invalid
            migration_threshold: 0, // Invalid
            creator: Pubkey::default(),
        };
        
        assert!(invalid_config.validate().is_err());
    }

    #[test]
    fn test_pool_state_operations() {
        let mut state = PoolState::new();
        
        assert!(state.is_active);
        assert_eq!(state.current_supply, 0);
        assert!(!state.is_migrated);
        
        // Test increment
        assert!(state.increment_supply().is_ok());
        assert_eq!(state.current_supply, 1);
        
        // Test migration
        assert!(state.migrate().is_ok());
        assert!(state.is_migrated);
        assert!(state.migrated_at.is_some());
    }

    #[test]
    fn test_pool_stats_operations() {
        let mut stats = PoolStats::new();
        
        // Test mint recording
        assert!(stats.record_mint(100_000_000, 99_000_000).is_ok());
        assert_eq!(stats.total_escrowed, 99_000_000);
        assert_eq!(stats.total_volume, 100_000_000);
        assert_eq!(stats.total_trades, 1);
        
        // Test trade recording
        assert!(stats.record_trade(200_000_000).is_ok());
        assert_eq!(stats.total_volume, 300_000_000);
        assert_eq!(stats.total_trades, 2);
    }
}

