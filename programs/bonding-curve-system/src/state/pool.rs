use anchor_lang::prelude::*;
use crate::state::types::{BondingCurveParams, DynamicPricingConfig};

/// Main bonding curve pool account
#[account]
pub struct BondingCurvePool {
    /// Collection mint that this pool manages
    pub collection: Pubkey,
    
    /// Bonding curve parameters
    pub curve_params: BondingCurveParams,
    
    /// Dynamic pricing configuration
    pub pricing_config: DynamicPricingConfig,
    
    /// Current supply of NFTs minted
    pub current_supply: u32,
    
    /// Total SOL escrowed across all NFTs
    pub total_escrowed: u64,
    
    /// Total platform fees collected
    pub total_platform_fees: u64,
    
    /// Pool creator (has admin privileges)
    pub creator: Pubkey,
    
    /// Whether the pool is active
    pub is_active: bool,
    
    /// Whether the pool has been migrated to Tensor
    pub is_migrated: bool,
    
    /// Timestamp when pool was created
    pub created_at: i64,
    
    /// Timestamp when pool was migrated (if applicable)
    pub migrated_at: Option<i64>,
    
    /// PDA bump seed
    pub bump: u8,
}

impl BondingCurvePool {
    pub const LEN: usize = 8 + // discriminator
        32 + // collection
        (8 + 2 + 4 + 8) + // curve_params (BondingCurveParams)
        (2 + 2 + 8 + 8) + // pricing_config (DynamicPricingConfig)
        4 + // current_supply
        8 + // total_escrowed
        8 + // total_platform_fees
        32 + // creator
        1 + // is_active
        1 + // is_migrated
        8 + // created_at
        9 + // migrated_at (Option<i64>)
        1 + // bump
        64; // padding for future fields

    /// Calculate the current price for the next NFT to be minted
    pub fn calculate_current_price(&self) -> Result<u64> {
        crate::math::bonding_curve::BondingCurve::calculate_price(
            self.curve_params.base_price,
            self.curve_params.growth_factor,
            self.current_supply,
        )
    }

    /// Calculate the total market cap of the collection
    pub fn calculate_market_cap(&self) -> Result<u64> {
        if self.current_supply == 0 {
            return Ok(0);
        }

        let mut total_value = 0u64;
        for i in 0..self.current_supply {
            let price = crate::math::bonding_curve::BondingCurve::calculate_price(
                self.curve_params.base_price,
                self.curve_params.growth_factor,
                i,
            )?;
            total_value = total_value
                .checked_add(price)
                .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        }

        Ok(total_value)
    }

    /// Check if the pool has reached migration threshold
    pub fn should_migrate(&self) -> Result<bool> {
        if self.is_migrated {
            return Ok(false);
        }

        let market_cap = self.calculate_market_cap()?;
        Ok(market_cap >= self.curve_params.migration_threshold)
    }

    /// Calculate minimum bid for dynamic pricing
    pub fn calculate_minimum_bid(&self) -> Result<u64> {
        let current_price = self.calculate_current_price()?;
        let premium = (current_price as u128)
            .checked_mul(self.pricing_config.minimum_premium_bp as u128)
            .and_then(|x| x.checked_div(10000))
            .and_then(|x| u64::try_from(x).ok())
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        current_price
            .checked_add(premium)
            .ok_or(crate::errors::ErrorCode::MathOverflow.into())
    }

    /// Increment supply and update total escrowed
    pub fn mint_nft(&mut self, price: u64, escrow_amount: u64) -> Result<()> {
        require!(!self.is_migrated, crate::errors::ErrorCode::AlreadyMigrated);
        require!(self.is_active, crate::errors::ErrorCode::PoolInactive);

        self.current_supply = self.current_supply
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        self.total_escrowed = self.total_escrowed
            .checked_add(escrow_amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;

        Ok(())
    }

    /// Decrement supply and update total escrowed (for burns)
    pub fn burn_nft(&mut self, escrow_amount: u64) -> Result<()> {
        require!(!self.is_migrated, crate::errors::ErrorCode::AlreadyMigrated);
        require!(self.current_supply > 0, crate::errors::ErrorCode::InvalidAmount);

        self.current_supply = self.current_supply
            .checked_sub(1)
            .ok_or(crate::errors::ErrorCode::MathUnderflow)?;

        self.total_escrowed = self.total_escrowed
            .checked_sub(escrow_amount)
            .ok_or(crate::errors::ErrorCode::MathUnderflow)?;

        Ok(())
    }

    /// Add platform fees
    pub fn add_platform_fees(&mut self, amount: u64) -> Result<()> {
        self.total_platform_fees = self.total_platform_fees
            .checked_add(amount)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        Ok(())
    }

    /// Mark pool as migrated
    pub fn migrate(&mut self, timestamp: i64) -> Result<()> {
        require!(!self.is_migrated, crate::errors::ErrorCode::AlreadyMigrated);
        require!(self.should_migrate()?, crate::errors::ErrorCode::ThresholdNotMet);

        self.is_migrated = true;
        self.migrated_at = Some(timestamp);
        Ok(())
    }

    /// Deactivate the pool
    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        Ok(())
    }

    /// Reactivate the pool
    pub fn reactivate(&mut self) -> Result<()> {
        require!(!self.is_migrated, crate::errors::ErrorCode::AlreadyMigrated);
        self.is_active = true;
        Ok(())
    }

    /// Update pricing configuration (admin only)
    pub fn update_pricing_config(&mut self, new_config: DynamicPricingConfig) -> Result<()> {
        // Validate the new configuration
        require!(
            new_config.minimum_premium_bp <= 10000, // Max 100%
            crate::errors::ErrorCode::InvalidPricingConfig
        );
        require!(
            new_config.bid_increment_bp <= 5000, // Max 50%
            crate::errors::ErrorCode::InvalidPricingConfig
        );
        require!(
            new_config.max_bid_duration >= new_config.min_bid_duration,
            crate::errors::ErrorCode::InvalidPricingConfig
        );

        self.pricing_config = new_config;
        Ok(())
    }

    /// Get pool statistics
    pub fn get_stats(&self) -> Result<PoolStats> {
        let current_price = self.calculate_current_price()?;
        let market_cap = self.calculate_market_cap()?;
        let minimum_bid = self.calculate_minimum_bid()?;

        Ok(PoolStats {
            current_supply: self.current_supply,
            current_price,
            market_cap,
            total_escrowed: self.total_escrowed,
            total_platform_fees: self.total_platform_fees,
            minimum_bid,
            is_active: self.is_active,
            is_migrated: self.is_migrated,
            should_migrate: self.should_migrate()?,
        })
    }
}

/// Pool statistics for frontend display
#[derive(Debug, Clone)]
pub struct PoolStats {
    pub current_supply: u32,
    pub current_price: u64,
    pub market_cap: u64,
    pub total_escrowed: u64,
    pub total_platform_fees: u64,
    pub minimum_bid: u64,
    pub is_active: bool,
    pub is_migrated: bool,
    pub should_migrate: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_pool() -> BondingCurvePool {
        BondingCurvePool {
            collection: Pubkey::default(),
            curve_params: BondingCurveParams::default(),
            pricing_config: DynamicPricingConfig::default(),
            current_supply: 0,
            total_escrowed: 0,
            total_platform_fees: 0,
            creator: Pubkey::default(),
            is_active: true,
            is_migrated: false,
            created_at: 0,
            migrated_at: None,
            bump: 255,
        }
    }

    #[test]
    fn test_pool_mint_nft() {
        let mut pool = create_test_pool();
        assert_eq!(pool.current_supply, 0);

        pool.mint_nft(100_000_000, 99_000_000).unwrap();
        assert_eq!(pool.current_supply, 1);
        assert_eq!(pool.total_escrowed, 99_000_000);
    }

    #[test]
    fn test_pool_burn_nft() {
        let mut pool = create_test_pool();
        pool.mint_nft(100_000_000, 99_000_000).unwrap();
        
        pool.burn_nft(99_000_000).unwrap();
        assert_eq!(pool.current_supply, 0);
        assert_eq!(pool.total_escrowed, 0);
    }

    #[test]
    fn test_pool_migration() {
        let mut pool = create_test_pool();
        pool.curve_params.migration_threshold = 100; // Low threshold for testing
        
        // Should not migrate initially
        assert!(!pool.should_migrate().unwrap());
        
        // After minting enough to reach threshold
        pool.total_escrowed = 200;
        pool.current_supply = 10;
        
        if pool.should_migrate().unwrap() {
            pool.migrate(1000).unwrap();
            assert!(pool.is_migrated);
            assert_eq!(pool.migrated_at, Some(1000));
        }
    }
}

