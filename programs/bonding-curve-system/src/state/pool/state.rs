use anchor_lang::prelude::*;

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

    /// Check if pool can accept new mints
    pub fn can_mint(&self, max_supply: u32) -> bool {
        self.is_active && 
        !self.is_migrated && 
        self.current_supply < max_supply
    }

    /// Increment supply after successful mint
    pub fn increment_supply(&mut self) -> Result<()> {
        self.current_supply = self.current_supply
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        Ok(())
    }

    /// Decrement supply after burn
    pub fn decrement_supply(&mut self) -> Result<()> {
        self.current_supply = self.current_supply
            .checked_sub(1)
            .ok_or(crate::errors::ErrorCode::MathUnderflow)?;
        Ok(())
    }

    /// Activate pool
    pub fn activate(&mut self) {
        self.is_active = true;
    }

    /// Deactivate pool
    pub fn deactivate(&mut self) {
        self.is_active = false;
    }

    /// Mark as migrated to Tensor
    pub fn migrate(&mut self) -> Result<()> {
        self.is_migrated = true;
        self.migrated_at = Some(Clock::get()?.unix_timestamp);
        self.is_active = false; // Deactivate after migration
        Ok(())
    }

    /// Get pool age in seconds
    pub fn age_seconds(&self) -> i64 {
        Clock::get()
            .map(|c| c.unix_timestamp - self.created_at)
            .unwrap_or(0)
    }

    /// Check if pool is ready for migration
    pub fn is_migration_ready(&self, market_cap: u64, threshold: u64) -> bool {
        self.is_active && 
        !self.is_migrated && 
        market_cap >= threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_state_operations() {
        let mut state = PoolState::new();
        
        assert!(state.is_active);
        assert_eq!(state.current_supply, 0);
        assert!(!state.is_migrated);
        assert!(state.can_mint(1000));
        
        // Test increment
        assert!(state.increment_supply().is_ok());
        assert_eq!(state.current_supply, 1);
        
        // Test decrement
        assert!(state.decrement_supply().is_ok());
        assert_eq!(state.current_supply, 0);
        
        // Test migration
        assert!(state.migrate().is_ok());
        assert!(state.is_migrated);
        assert!(!state.is_active);
        assert!(state.migrated_at.is_some());
    }

    #[test]
    fn test_pool_state_validation() {
        let mut state = PoolState::new();
        
        // Test can_mint with different conditions
        assert!(state.can_mint(1000));
        
        state.deactivate();
        assert!(!state.can_mint(1000));
        
        state.activate();
        state.current_supply = 1000;
        assert!(!state.can_mint(1000)); // At max supply
        
        state.current_supply = 999;
        assert!(state.can_mint(1000)); // Below max supply
    }
}

