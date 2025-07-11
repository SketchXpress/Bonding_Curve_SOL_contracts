use anchor_lang::prelude::*;
use super::ErrorCode;

/// Simple error context for debugging
#[derive(Debug, Clone)]
pub struct ErrorContext {
    pub code: ErrorCode,
    pub instruction: String,
    pub details: Option<String>,
}

impl ErrorContext {
    pub fn new(code: ErrorCode, instruction: &str) -> Self {
        Self {
            code,
            instruction: instruction.to_string(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: &str) -> Self {
        self.details = Some(details.to_string());
        self
    }

    pub fn log(&self) {
        msg!(
            "[ERROR] {} in {} | {}",
            self.code as u32,
            self.instruction,
            self.details.as_deref().unwrap_or("No details")
        );
    }
}

/// Macro for quick error creation
#[macro_export]
macro_rules! error_ctx {
    ($code:expr, $instruction:expr) => {
        ErrorContext::new($code, $instruction)
    };
    ($code:expr, $instruction:expr, $details:expr) => {
        ErrorContext::new($code, $instruction).with_details($details)
    };
}

