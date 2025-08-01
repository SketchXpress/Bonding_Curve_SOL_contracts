use anchor_lang::prelude::*;
use crate::{
    errors::ErrorCode,
};
use super::{MintNft, MintNftArgs};

/// Create NFT and metadata
pub fn create_nft_and_metadata(ctx: &Context<MintNft>, args: &MintNftArgs) -> Result<()> {
    // Mint NFT to minter
    mint_nft_token(ctx)?;

    // Create metadata
    create_metadata_account(ctx, args)?;

    Ok(())
}

/// Mint NFT token to minter's account
fn mint_nft_token(ctx: &Context<MintNft>) -> Result<()> {
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.minter_token_account.to_account_info(),
        authority: ctx.accounts.minter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::mint_to(cpi_ctx, 1)?;

    msg!("NFT minted successfully");
    Ok(())
}

/// Create Metaplex metadata account
fn create_metadata_account(ctx: &Context<MintNft>, args: &MintNftArgs) -> Result<()> {
    // Validate metadata PDA
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let metadata_seeds = &[
        b"metadata",
        mpl_token_metadata::ID.as_ref(),
        nft_mint_key.as_ref(),
    ];
    let (metadata_pda, _) = Pubkey::find_program_address(metadata_seeds, &mpl_token_metadata::ID);

    if metadata_pda != ctx.accounts.metadata.key() {
        msg!("Invalid metadata PDA");
        return Err(ErrorCode::InvalidAccount.into());
    }

    // Create metadata instruction
    let create_metadata_ix = mpl_token_metadata::instructions::CreateMetadataAccountV3 {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.nft_mint.key(),
        mint_authority: ctx.accounts.minter.key(),
        payer: ctx.accounts.minter.key(),
        update_authority: (ctx.accounts.minter.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let metadata_data = mpl_token_metadata::types::DataV2 {
        name: args.name.clone(),
        symbol: args.symbol.clone(),
        uri: args.uri.clone(),
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    // Execute metadata creation
    anchor_lang::solana_program::program::invoke(
        &create_metadata_ix.instruction(mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs {
            data: metadata_data,
            is_mutable: true,
            collection_details: None,
        }),
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.minter.to_account_info(),
            ctx.accounts.minter.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;

    msg!("Metadata created successfully");
    Ok(())
}

