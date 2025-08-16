pub mod accounts;

pub use accounts::*;

use anchor_lang::prelude::*;
use mpl_token_metadata::{instructions::CreateMetadataAccountV3, types::DataV2};
use anchor_lang::solana_program::program::invoke;
use crate::ErrorCode;
use crate::math::bonding_curve::calculate_bonding_curve_price;

/// NFT minting instruction with collection and bonding curve integration
pub fn mint_nft(mut ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting NFT mint for collection: {}", args.collection_mint);

    // Validate input
    if args.name.is_empty() || args.symbol.is_empty() {
        return Err(ErrorCode::InvalidAmount.into());
    }
    msg!("Input validation passed");

    // Get current price from bonding curve pool
    let pool = &mut ctx.accounts.pool;
    let current_supply = pool.state.current_supply;
    let price = calculate_bonding_curve_price(
        pool.config.base_price,
        pool.config.growth_factor,
        current_supply
    )?;
    msg!("Current NFT price: {} lamports for supply: {}", price, current_supply);

    // Update pool state
    pool.state.current_supply = pool.state.current_supply.checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    pool.stats.total_trades = pool.stats.total_trades.checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;

    // Mint the NFT token
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.minter_token_account.to_account_info(),
        authority: ctx.accounts.minter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::mint_to(cpi_ctx, 1)?;
    msg!("NFT token minted successfully");

    // Create NFT metadata with collection reference
    let collection = Some(mpl_token_metadata::types::Collection {
        verified: false, // Will be verified by collection update authority
        key: args.collection_mint,
    });

    let data_v2 = DataV2 {
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection,
        uses: None,
    };

    let metadata_instruction = CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.nft_mint.key(),
        mint_authority: ctx.accounts.minter.key(),
        payer: ctx.accounts.minter.key(),
        update_authority: (ctx.accounts.minter.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let metadata_infos = vec![
        ctx.accounts.metadata.to_account_info(),
        ctx.accounts.nft_mint.to_account_info(),
        ctx.accounts.minter.to_account_info(),
        ctx.accounts.minter.to_account_info(),
        ctx.accounts.minter.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.rent.to_account_info(),
    ];

    invoke(
        &metadata_instruction.instruction(mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
            data: data_v2,
            is_mutable: true,
            collection_details: None,
        }),
        &metadata_infos,
    )?;
    msg!("NFT metadata created successfully");

    // Initialize minter tracker PDA
    super::tracker::initialize_minter_tracker(&mut ctx)?;

    msg!("Minimal NFT mint completed successfully");
    msg!("NFT: {}", ctx.accounts.nft_mint.key());
    msg!("Price: {} lamports", price);

    Ok(())
}

