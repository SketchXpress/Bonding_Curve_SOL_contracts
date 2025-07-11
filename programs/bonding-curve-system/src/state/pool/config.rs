use anchor_lang::prelude::*;

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

    /// Create new pool configuration
    pub fn new(
        base_price: u64,
        growth_factor: u16,
        max_supply: u32,
        migration_threshold: u64,
        creator: Pubkey,
    ) -> Result<Self> {
        let config = Self {
            base_price,
            growth_factor,
            max_supply,
            migration_threshold,
            creator,
        };
        
        config.validate()?;
        Ok(config)
    }

    /// Validate configuration parameters
    pub fn validate(&self) -> Result<()> {
        require!(self.base_price > 0, crate::errors::ErrorCode::InvalidAmount);
        require!(self.growth_factor > 10000, crate::errors::ErrorCode::InvalidAmount); // Must be > 100%
        require!(self.max_supply > 0, crate::errors::ErrorCode::InvalidAmount);
        require!(self.migration_threshold > 0, crate::errors::ErrorCode::InvalidAmount);
        Ok(())
    }

    /// Check if configuration allows minting
    pub fn allows_minting(&self) -> bool {
        self.base_price > 0 && self.max_supply > 0
    }

    /// Get expected price at supply level
    pub fn price_at_supply(&self, supply: u32) -> Result<u64> {
        crate::math::calculate_bonding_curve_price(
            self.base_price,
            self.growth_factor,
            supply,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_config_creation() {
        let config = PoolConfig::new(
            100_000_000, // 0.1 SOL
            11000, // 110% (10% growth)
            1000,
            690_000_000_000, // 690 SOL
            Pubkey::default(),
        ).unwrap();
        
        assert!(config.validate().is_ok());
        assert!(config.allows_minting());
    }

    #[test]
    fn test_invalid_config() {
        let result = PoolConfig::new(
            0, // Invalid base price
            5000, // Too low growth factor
            0, // Invalid max supply
            0, // Invalid migration threshold
            Pubkey::default(),
        );
        
        assert!(result.is_err());
    }
}

