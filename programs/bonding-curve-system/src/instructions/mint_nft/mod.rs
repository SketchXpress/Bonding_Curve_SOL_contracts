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

/// Main mint NFT instruction with complete functionality
pub fn mint_nft(mut ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting complete NFT mint with bonding curve");

    // Step 1: Validate inputs
    validate_mint_inputs(&args)?;

    // Step 2: Calculate mint price from bonding curve
    let price = calculate_mint_price(&ctx.accounts.bonding_curve_pool)?;

    // Step 3: Process payment
    process_mint_payment(&ctx, price)?;

    // Step 4: Create NFT and metadata
    create_nft_and_metadata(&ctx, &args)?;

    // Step 5: Setup escrow
    initialize_nft_escrow(&mut ctx, price)?;

    // Step 6: Initialize minter tracker
    initialize_minter_tracker(&mut ctx)?;

    // Step 7: Update pool state
    update_pool_state(&mut ctx, price)?;

    msg!("NFT mint completed successfully - Price: {} lamports", price);
    Ok(())
}

