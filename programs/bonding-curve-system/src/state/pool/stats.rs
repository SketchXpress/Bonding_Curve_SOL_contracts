use anchor_lang::prelude::*;

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

    /// Record a mint transaction
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

    /// Record a trade transaction
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

    /// Record a burn transaction
    pub fn record_burn(&mut self, escrow_amount: u64) -> Result<()> {
        self.total_escrowed = self.total_escrowed
            .checked_sub(escrow_amount)
            .ok_or(crate::errors::ErrorCode::MathUnderflow)?;
        
        self.total_trades = self.total_trades
            .checked_add(1)
            .ok_or(crate::errors::ErrorCode::MathOverflow)?;
        
        self.last_trade_at = Some(Clock::get()?.unix_timestamp);
        
        Ok(())
    }

    /// Get average trade size
    pub fn average_trade_size(&self) -> u64 {
        if self.total_trades == 0 {
            0
        } else {
            self.total_volume / self.total_trades as u64
        }
    }

    /// Get trading activity score (trades per day)
    pub fn trading_activity(&self, pool_age_seconds: i64) -> f64 {
        if pool_age_seconds <= 0 {
            0.0
        } else {
            let days = pool_age_seconds as f64 / 86400.0; // seconds per day
            self.total_trades as f64 / days
        }
    }

    /// Check if pool is actively traded
    pub fn is_actively_traded(&self, min_trades: u32, max_age_hours: i64) -> bool {
        if let Some(last_trade) = self.last_trade_at {
            let current_time = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
            let hours_since_last_trade = (current_time - last_trade) / 3600;
            
            self.total_trades >= min_trades && hours_since_last_trade <= max_age_hours
        } else {
            false
        }
    }

    /// Get escrow utilization ratio
    pub fn escrow_utilization(&self, total_possible_escrow: u64) -> f64 {
        if total_possible_escrow == 0 {
            0.0
        } else {
            self.total_escrowed as f64 / total_possible_escrow as f64
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_stats_operations() {
        let mut stats = PoolStats::new();
        
        // Test mint recording
        assert!(stats.record_mint(100_000_000, 99_000_000).is_ok());
        assert_eq!(stats.total_escrowed, 99_000_000);
        assert_eq!(stats.total_volume, 100_000_000);
        assert_eq!(stats.total_trades, 1);
        assert!(stats.last_trade_at.is_some());
        
        // Test trade recording
        assert!(stats.record_trade(200_000_000).is_ok());
        assert_eq!(stats.total_volume, 300_000_000);
        assert_eq!(stats.total_trades, 2);
        
        // Test burn recording
        assert!(stats.record_burn(50_000_000).is_ok());
        assert_eq!(stats.total_escrowed, 49_000_000);
        assert_eq!(stats.total_trades, 3);
    }

    #[test]
    fn test_pool_stats_calculations() {
        let mut stats = PoolStats::new();
        
        // Add some data
        stats.record_mint(100_000_000, 99_000_000).unwrap();
        stats.record_trade(200_000_000).unwrap();
        
        // Test average trade size
        assert_eq!(stats.average_trade_size(), 150_000_000); // (100 + 200) / 2
        
        // Test trading activity
        let activity = stats.trading_activity(86400); // 1 day
        assert_eq!(activity, 2.0); // 2 trades per day
        
        // Test escrow utilization
        let utilization = stats.escrow_utilization(200_000_000);
        assert_eq!(utilization, 0.495); // 99M / 200M
    }
}

