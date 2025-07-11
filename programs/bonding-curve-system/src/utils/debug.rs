use anchor_lang::prelude::*;
use std::collections::HashMap;

/// Debug logging levels
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
}

/// Debug context for tracking execution flow
#[derive(Debug, Clone)]
pub struct DebugContext {
    pub instruction: String,
    pub step: String,
    pub timestamp: i64,
    pub accounts: Vec<String>,
    pub data: HashMap<String, String>,
}

impl DebugContext {
    pub fn new(instruction: &str) -> Self {
        Self {
            instruction: instruction.to_string(),
            step: "initialization".to_string(),
            timestamp: Clock::get().map(|c| c.unix_timestamp).unwrap_or(0),
            accounts: Vec::new(),
            data: HashMap::new(),
        }
    }

    pub fn step(&mut self, step: &str) -> &mut Self {
        self.step = step.to_string();
        self.timestamp = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
        self
    }

    pub fn add_account(&mut self, name: &str, pubkey: &Pubkey) -> &mut Self {
        self.accounts.push(format!("{}: {}", name, pubkey));
        self
    }

    pub fn add_data(&mut self, key: &str, value: &str) -> &mut Self {
        self.data.insert(key.to_string(), value.to_string());
        self
    }

    pub fn log(&self, level: LogLevel, message: &str) {
        let level_str = match level {
            LogLevel::Trace => "TRACE",
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO",
            LogLevel::Warn => "WARN",
            LogLevel::Error => "ERROR",
        };

        msg!(
            "[{}] [{}:{}] {} | Accounts: {:?} | Data: {:?}",
            level_str,
            self.instruction,
            self.step,
            message,
            self.accounts,
            self.data
        );
    }
}

/// Macro for easy debug logging
#[macro_export]
macro_rules! debug_log {
    ($ctx:expr, $level:expr, $($arg:tt)*) => {
        $ctx.log($level, &format!($($arg)*));
    };
}

/// Macro for tracing function entry and exit
#[macro_export]
macro_rules! trace_function {
    ($ctx:expr, $func_name:expr) => {
        $ctx.step(&format!("entering_{}", $func_name));
        debug_log!($ctx, LogLevel::Trace, "Entering function: {}", $func_name);
    };
}

/// Account inspector for debugging account states
pub struct AccountInspector;

impl AccountInspector {
    /// Inspect account basic information
    pub fn inspect_account(account: &AccountInfo, name: &str) -> String {
        format!(
            "Account[{}]: key={}, owner={}, lamports={}, data_len={}, executable={}, rent_epoch={}",
            name,
            account.key(),
            account.owner,
            account.lamports(),
            account.data_len(),
            account.executable,
            account.rent_epoch
        )
    }

    /// Inspect token account
    pub fn inspect_token_account(account: &Account<anchor_spl::token::TokenAccount>, name: &str) -> String {
        format!(
            "TokenAccount[{}]: mint={}, owner={}, amount={}, delegate={:?}, state={:?}",
            name,
            account.mint,
            account.owner,
            account.amount,
            account.delegate,
            account.state
        )
    }

    /// Inspect system account
    pub fn inspect_system_account(account: &SystemAccount, name: &str) -> String {
        format!(
            "SystemAccount[{}]: key={}, lamports={}",
            name,
            account.key(),
            account.lamports()
        )
    }

    /// Log all accounts in a context
    pub fn log_all_accounts<T>(ctx: &Context<T>, debug_ctx: &mut DebugContext) 
    where
        T: Accounts,
    {
        debug_ctx.step("account_inspection");
        
        // Log program account
        let program_info = Self::inspect_account(&ctx.program, "program");
        debug_log!(debug_ctx, LogLevel::Debug, "{}", program_info);

        // Log remaining accounts
        for (i, account) in ctx.remaining_accounts.iter().enumerate() {
            let account_info = Self::inspect_account(account, &format!("remaining_{}", i));
            debug_log!(debug_ctx, LogLevel::Debug, "{}", account_info);
        }
    }
}

/// Transaction state tracker for debugging
#[derive(Debug, Clone)]
pub struct TransactionTracker {
    pub transaction_id: String,
    pub instruction: String,
    pub start_time: i64,
    pub checkpoints: Vec<(String, i64)>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl TransactionTracker {
    pub fn new(instruction: &str) -> Self {
        let start_time = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
        Self {
            transaction_id: format!("{}_{}", instruction, start_time),
            instruction: instruction.to_string(),
            start_time,
            checkpoints: Vec::new(),
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn checkpoint(&mut self, name: &str) {
        let timestamp = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
        self.checkpoints.push((name.to_string(), timestamp));
        msg!(
            "[CHECKPOINT] {} | {} | Duration: {}ms",
            self.transaction_id,
            name,
            (timestamp - self.start_time) * 1000
        );
    }

    pub fn error(&mut self, error: &str) {
        self.errors.push(error.to_string());
        msg!(
            "[ERROR] {} | {}",
            self.transaction_id,
            error
        );
    }

    pub fn warning(&mut self, warning: &str) {
        self.warnings.push(warning.to_string());
        msg!(
            "[WARNING] {} | {}",
            self.transaction_id,
            warning
        );
    }

    pub fn finish(&self) {
        let end_time = Clock::get().map(|c| c.unix_timestamp).unwrap_or(0);
        let total_duration = (end_time - self.start_time) * 1000;
        
        msg!(
            "[TRANSACTION_COMPLETE] {} | Total Duration: {}ms | Checkpoints: {} | Errors: {} | Warnings: {}",
            self.transaction_id,
            total_duration,
            self.checkpoints.len(),
            self.errors.len(),
            self.warnings.len()
        );

        // Log detailed checkpoint timing
        for (i, (name, timestamp)) in self.checkpoints.iter().enumerate() {
            let duration = if i == 0 {
                (timestamp - self.start_time) * 1000
            } else {
                (timestamp - self.checkpoints[i-1].1) * 1000
            };
            msg!(
                "[TIMING] {} | Step {}: {} ({}ms)",
                self.transaction_id,
                i + 1,
                name,
                duration
            );
        }
    }
}

/// Memory usage tracker
pub struct MemoryTracker {
    pub initial_compute_units: u64,
    pub checkpoints: Vec<(String, u64)>,
}

impl MemoryTracker {
    pub fn new() -> Self {
        Self {
            initial_compute_units: 0, // Would need to get from runtime
            checkpoints: Vec::new(),
        }
    }

    pub fn checkpoint(&mut self, name: &str) {
        // In a real implementation, you'd get actual compute units used
        let compute_units = 0; // Placeholder
        self.checkpoints.push((name.to_string(), compute_units));
        msg!(
            "[MEMORY] Checkpoint: {} | Compute Units: {}",
            name,
            compute_units
        );
    }
}

/// State validator for debugging
pub struct StateValidator;

impl StateValidator {
    /// Validate account state consistency
    pub fn validate_account_state<T>(account: &Account<T>, name: &str, debug_ctx: &mut DebugContext) -> bool 
    where
        T: AccountSerialize + AccountDeserialize + Clone,
    {
        debug_ctx.step(&format!("validating_{}", name));
        
        // Check if account is properly initialized
        if account.data_is_empty() {
            debug_log!(debug_ctx, LogLevel::Error, "Account {} is empty", name);
            return false;
        }

        // Check account size
        let expected_size = std::mem::size_of::<T>();
        if account.data_len() < expected_size {
            debug_log!(
                debug_ctx, 
                LogLevel::Error, 
                "Account {} size mismatch: expected {}, got {}", 
                name, 
                expected_size, 
                account.data_len()
            );
            return false;
        }

        debug_log!(debug_ctx, LogLevel::Debug, "Account {} validation passed", name);
        true
    }

    /// Validate numerical constraints
    pub fn validate_numerical_constraints(
        value: u64,
        min: u64,
        max: u64,
        name: &str,
        debug_ctx: &mut DebugContext,
    ) -> bool {
        debug_ctx.step(&format!("validating_numerical_{}", name));
        
        if value < min {
            debug_log!(
                debug_ctx,
                LogLevel::Error,
                "Value {} ({}) below minimum ({})",
                name,
                value,
                min
            );
            return false;
        }

        if value > max {
            debug_log!(
                debug_ctx,
                LogLevel::Error,
                "Value {} ({}) above maximum ({})",
                name,
                value,
                max
            );
            return false;
        }

        debug_log!(
            debug_ctx,
            LogLevel::Debug,
            "Numerical validation passed for {} ({})",
            name,
            value
        );
        true
    }
}

/// Debug configuration
#[derive(Debug, Clone)]
pub struct DebugConfig {
    pub enabled: bool,
    pub log_level: LogLevel,
    pub log_accounts: bool,
    pub log_timing: bool,
    pub log_memory: bool,
    pub log_state_changes: bool,
}

impl Default for DebugConfig {
    fn default() -> Self {
        Self {
            enabled: true, // Enable by default in development
            log_level: LogLevel::Debug,
            log_accounts: true,
            log_timing: true,
            log_memory: false, // Expensive, disable by default
            log_state_changes: true,
        }
    }
}

/// Global debug manager
pub struct DebugManager {
    config: DebugConfig,
}

impl DebugManager {
    pub fn new(config: DebugConfig) -> Self {
        Self { config }
    }

    pub fn should_log(&self, level: LogLevel) -> bool {
        if !self.config.enabled {
            return false;
        }

        match (level, self.config.log_level) {
            (LogLevel::Error, _) => true,
            (LogLevel::Warn, LogLevel::Trace | LogLevel::Debug | LogLevel::Info | LogLevel::Warn) => true,
            (LogLevel::Info, LogLevel::Trace | LogLevel::Debug | LogLevel::Info) => true,
            (LogLevel::Debug, LogLevel::Trace | LogLevel::Debug) => true,
            (LogLevel::Trace, LogLevel::Trace) => true,
            _ => false,
        }
    }

    pub fn log_if_enabled(&self, level: LogLevel, message: &str) {
        if self.should_log(level) {
            msg!("[{}] {}", 
                match level {
                    LogLevel::Trace => "TRACE",
                    LogLevel::Debug => "DEBUG", 
                    LogLevel::Info => "INFO",
                    LogLevel::Warn => "WARN",
                    LogLevel::Error => "ERROR",
                },
                message
            );
        }
    }
}

/// Macro for conditional debug logging
#[macro_export]
macro_rules! debug_if_enabled {
    ($manager:expr, $level:expr, $($arg:tt)*) => {
        if $manager.should_log($level) {
            $manager.log_if_enabled($level, &format!($($arg)*));
        }
    };
}

/// Error context with stack trace simulation
#[derive(Debug, Clone)]
pub struct ErrorStackTrace {
    pub error_code: u32,
    pub error_message: String,
    pub instruction: String,
    pub function_stack: Vec<String>,
    pub account_context: Vec<String>,
    pub timestamp: i64,
}

impl ErrorStackTrace {
    pub fn new(error_code: u32, error_message: &str, instruction: &str) -> Self {
        Self {
            error_code,
            error_message: error_message.to_string(),
            instruction: instruction.to_string(),
            function_stack: Vec::new(),
            account_context: Vec::new(),
            timestamp: Clock::get().map(|c| c.unix_timestamp).unwrap_or(0),
        }
    }

    pub fn push_function(&mut self, function: &str) -> &mut Self {
        self.function_stack.push(function.to_string());
        self
    }

    pub fn add_account_context(&mut self, context: &str) -> &mut Self {
        self.account_context.push(context.to_string());
        self
    }

    pub fn log_stack_trace(&self) {
        msg!("=== ERROR STACK TRACE ===");
        msg!("Error Code: {}", self.error_code);
        msg!("Error Message: {}", self.error_message);
        msg!("Instruction: {}", self.instruction);
        msg!("Timestamp: {}", self.timestamp);
        
        msg!("Function Stack:");
        for (i, function) in self.function_stack.iter().enumerate() {
            msg!("  {}: {}", i + 1, function);
        }
        
        if !self.account_context.is_empty() {
            msg!("Account Context:");
            for context in &self.account_context {
                msg!("  - {}", context);
            }
        }
        msg!("=== END STACK TRACE ===");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_debug_context() {
        let mut ctx = DebugContext::new("test_instruction");
        ctx.step("validation")
           .add_data("amount", "1000000000")
           .add_data("user", "test_user");
        
        assert_eq!(ctx.instruction, "test_instruction");
        assert_eq!(ctx.step, "validation");
        assert_eq!(ctx.data.get("amount"), Some(&"1000000000".to_string()));
    }

    #[test]
    fn test_transaction_tracker() {
        let mut tracker = TransactionTracker::new("mint_nft");
        tracker.checkpoint("validation_complete");
        tracker.checkpoint("escrow_created");
        tracker.warning("High gas usage detected");
        
        assert_eq!(tracker.instruction, "mint_nft");
        assert_eq!(tracker.checkpoints.len(), 2);
        assert_eq!(tracker.warnings.len(), 1);
    }

    #[test]
    fn test_debug_manager() {
        let config = DebugConfig {
            enabled: true,
            log_level: LogLevel::Info,
            ..Default::default()
        };
        let manager = DebugManager::new(config);
        
        assert!(manager.should_log(LogLevel::Error));
        assert!(manager.should_log(LogLevel::Info));
        assert!(!manager.should_log(LogLevel::Debug));
        assert!(!manager.should_log(LogLevel::Trace));
    }

    #[test]
    fn test_error_stack_trace() {
        let mut trace = ErrorStackTrace::new(6001, "Insufficient balance", "place_bid");
        trace.push_function("validate_bid_amount")
             .push_function("check_user_balance")
             .add_account_context("User account: 11111111111111111111111111111112");
        
        assert_eq!(trace.error_code, 6001);
        assert_eq!(trace.function_stack.len(), 2);
        assert_eq!(trace.account_context.len(), 1);
    }
}

