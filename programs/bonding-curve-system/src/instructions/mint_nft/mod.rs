pub mod accounts;

pub use accounts::*;

use anchor_lang::prelude::*;
use mpl_token_metadata::{instructions::CreateMetadataAccountV3, types::DataV2};
use anchor_lang::solana_program::program::invoke;
use crate::math::bonding_curve::calculate_bonding_curve_price;
use crate::ErrorCode;

/// Main mint NFT instruction with bonding curve pricing and escrow
pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting NFT mint with bonding curve pricing");

    // Validate input
    if args.name.is_empty() || args.symbol.is_empty() {
        return Err(ErrorCode::InvalidAmount.into());
    }

    let bonding_curve_pool = &mut ctx.accounts.bonding_curve_pool;
    let nft_escrow = &mut ctx.accounts.nft_escrow;
    let minter_tracker = &mut ctx.accounts.minter_tracker;

    // Calculate NFT price based on current supply using bonding curve
    let price = calculate_bonding_curve_price(
        bonding_curve_pool.config.base_price,
        bonding_curve_pool.config.growth_factor,
        bonding_curve_pool.state.current_supply,
    )?;
    msg!("NFT price calculated: {} lamports", price);

    // Check if minter has enough SOL
    let minter_balance = ctx.accounts.minter.lamports();
    if minter_balance < price {
        return Err(ErrorCode::InsufficientBalance.into());
    }

    // Transfer SOL payment from minter to escrow
    let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.minter.key(),
        &nft_escrow.key(),
        price,
    );
    
    anchor_lang::solana_program::program::invoke(
        &transfer_instruction,
        &[
            ctx.accounts.minter.to_account_info(),
            nft_escrow.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    msg!("Payment transferred to escrow: {} lamports", price);

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

    // Create NFT metadata
    let data_v2 = DataV2 {
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
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

    // Initialize NFT escrow state with 99% of payment
    nft_escrow.nft_mint = ctx.accounts.nft_mint.key();
    nft_escrow.lamports = (price * 99) / 100; // 99% in escrow
    nft_escrow.last_price = price;

    // Update minter tracker
    minter_tracker.nft_mint = ctx.accounts.nft_mint.key();
    minter_tracker.original_minter = ctx.accounts.minter.key();
    minter_tracker.minted_at = Clock::get()?.unix_timestamp;
    minter_tracker.collection = bonding_curve_pool.collection;
    minter_tracker.total_revenue_earned = 0;
    minter_tracker.sale_count = 0;

    // Update bonding curve pool state
    bonding_curve_pool.state.current_supply += 1;
    bonding_curve_pool.stats.total_volume += price;

    msg!("NFT mint completed successfully with bonding curve pricing");
    msg!("NFT: {}", ctx.accounts.nft_mint.key());
    msg!("Price: {} lamports", price);
    msg!("Escrow amount: {} lamports", nft_escrow.lamports);
    msg!("Original minter: {}", minter_tracker.original_minter);

    Ok(())
}

