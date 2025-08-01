pub mod accounts;
pub mod validation;
pub mod payment;
pub mod nft_creation;
pub mod escrow;
pub mod tracker;
pub mod pool_update;

pub use accounts::*;
pub use validation::*;
pub use payment::*;
pub use nft_creation::*;
pub use escrow::*;
pub use tracker::*;
pub use pool_update::*;

use anchor_lang::prelude::*;
use crate::{utils::debug::*, debug_log};

/// Main mint NFT instruction - orchestrates all steps
pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    let mut debug_ctx = DebugContext::new("mint_nft");
    debug_log!(debug_ctx, LogLevel::Info, "Starting NFT mint");

    // Step 1: Validate inputs
    validate_mint_inputs(&args, &mut debug_ctx)?;

    // Step 2: Calculate price and validate payment
    let mint_price = calculate_mint_price(&ctx.accounts.bonding_curve_pool, &mut debug_ctx)?;
    validate_payment(&ctx.accounts.minter, mint_price, &mut debug_ctx)?;

    // Step 3: Process payment and fees
    process_mint_payment(&ctx, mint_price, &mut debug_ctx)?;

    // Step 4: Create NFT and metadata
    create_nft_and_metadata(&ctx, &args, &mut debug_ctx)?;

    // Step 5: Initialize escrow
    initialize_nft_escrow(&ctx, mint_price, &mut debug_ctx)?;

    // Step 6: Track original minter
    initialize_minter_tracker(&ctx, &mut debug_ctx)?;

    // Step 7: Update pool state
    update_pool_state(&ctx, mint_price, &mut debug_ctx)?;

    debug_log!(debug_ctx, LogLevel::Info, "NFT mint completed successfully");
    Ok(())
}

