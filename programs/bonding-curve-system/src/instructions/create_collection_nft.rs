// Instructions for creating a Metaplex Collection NFT

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use mpl_token_metadata::instructions::{
    CreateMetadataAccountV3Cpi,
    CreateMetadataAccountV3CpiAccounts,
    CreateMetadataAccountV3InstructionArgs,
    CreateMasterEditionV3Cpi,
    CreateMasterEditionV3CpiAccounts,
    CreateMasterEditionV3InstructionArgs
};
use mpl_token_metadata::types::{Creator, DataV2, CollectionDetails};

#[derive(Accounts)]
pub struct CreateCollectionNft<
    'info
> {
    #[account(mut)]
    pub payer: Signer<
        'info
    >,

    // Initialize the mint account for the collection NFT
    #[account(
        init,
        payer = payer,
        mint::decimals = 0, // NFTs have 0 decimals
        mint::authority = payer.key(), // Payer is the mint authority
        mint::freeze_authority = payer.key() // Payer is the freeze authority
    )]
    pub collection_mint: Account<
        'info,
        Mint
    >,

    /// CHECK: This is the metadata account, we will create it via CPI
    #[account(mut)]
    pub metadata_account: UncheckedAccount<
        'info
    >,

    /// CHECK: This is the master edition account, we will create it via CPI
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<
        'info
    >,

    /// CHECK: Metaplex Token Metadata program ID
    pub token_metadata_program: UncheckedAccount<
        'info
    >,

    pub token_program: Program<
        'info,
        Token
    >,
    pub system_program: Program<
        'info,
        System
    >,
    pub rent: Sysvar<
        'info,
        Rent
    >,
}

pub fn create_collection_nft(
    ctx: Context<CreateCollectionNft>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    // Define the creator for the metadata
    let creator = vec![
        Creator {
            address: ctx.accounts.payer.key(), // The payer is the creator
            verified: true, // Mark creator as verified since they are signing
            share: 100,
        },
    ];

    // CPI to create the metadata account
    let rent_account_info = ctx.accounts.rent.to_account_info();
    let metadata_accounts = CreateMetadataAccountV3CpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        mint: &ctx.accounts.collection_mint.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        update_authority: (&ctx.accounts.payer.to_account_info(), true), // Payer is the update authority
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&rent_account_info),
    };

    let metadata_args = CreateMetadataAccountV3InstructionArgs {
        data: DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0, // Collections typically don't have seller fees
            creators: Some(creator),
            collection: None, // This NFT is the collection itself
            uses: None,
        },
        is_mutable: true,
        collection_details: Some(CollectionDetails::V1 { size: 0 }), // Mark as a sized collection NFT
    };

    CreateMetadataAccountV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        metadata_accounts,
        metadata_args
    ).invoke_signed(
        // We need seeds if the payer is a PDA, but here it's a Signer
        &[],
    )?;

    // CPI to create the master edition account
    let rent_account_info_for_master = ctx.accounts.rent.to_account_info();
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &ctx.accounts.master_edition_account.to_account_info(),
        mint: &ctx.accounts.collection_mint.to_account_info(),
        update_authority: &ctx.accounts.payer.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        token_program: &ctx.accounts.token_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&rent_account_info_for_master),
    };

    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // Master Edition for NFTs has max_supply 0
    };

    CreateMasterEditionV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        master_edition_accounts,
        master_edition_args
    ).invoke_signed(
        // We need seeds if the payer is a PDA, but here it's a Signer
        &[],
    )?;

    msg!("Collection NFT created successfully!");
    msg!("Collection Mint Address: {}", ctx.accounts.collection_mint.key());

    Ok(())
}

