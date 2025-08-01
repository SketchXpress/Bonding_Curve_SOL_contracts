pub mod accounts;

pub use accounts::*;

use anchor_lang::prelude::*;
use mpl_token_metadata::{instructions::CreateMetadataAccountV3, types::DataV2};
use anchor_lang::solana_program::program::invoke;
use crate::ErrorCode;

/// Minimal NFT minting instruction to test stack overflow fix
pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting minimal NFT mint");

    // Validate input
    if args.name.is_empty() || args.symbol.is_empty() {
        return Err(ErrorCode::InvalidAmount.into());
    }
    msg!("Input validation passed");

    // Simple fixed price for testing
    let price = 1_000_000u64; // 0.001 SOL
    msg!("Price set to {} lamports", price);

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

    msg!("Minimal NFT mint completed successfully");
    msg!("NFT: {}", ctx.accounts.nft_mint.key());
    msg!("Price: {} lamports", price);

    Ok(())
}

