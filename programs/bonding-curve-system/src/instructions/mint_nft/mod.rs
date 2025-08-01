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

/// Main mint NFT instruction - orchestrates all steps
pub fn mint_nft(mut ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting NFT mint");

    // Step 1: Validate inputs
    validate_mint_inputs(&args)?;

    // Step 2: Calculate price and validate payment
    let mint_price = calculate_mint_price(&ctx.accounts.bonding_curve_pool)?;
    validate_payment(&ctx.accounts.minter, mint_price)?;

    // Step 3: Process payment and fees
    process_mint_payment(&mut ctx, mint_price)?;

    // Step 4: Create NFT and metadata
    create_nft_and_metadata(&mut ctx, &args)?;

    // Step 5: Initialize escrow
    initialize_nft_escrow(&mut ctx, mint_price)?;

    // Step 6: Track original minter
    initialize_minter_tracker(&mut ctx)?;

    // Step 7: Update pool state
    update_pool_state(&mut ctx, mint_price)?;

    msg!("NFT mint completed successfully");
    Ok(())
}

