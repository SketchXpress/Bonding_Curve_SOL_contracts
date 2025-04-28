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
use mpl_token_metadata::types::{Creator, DataV2, Collection};

use crate::{
    state::{BondingCurvePool, NftEscrow},
    errors::ErrorCode,
    math::price_calculation::calculate_mint_price,
};

#[derive(Accounts)]
pub struct MintNFT<
    'info
> {
    #[account(mut)]
    pub payer: Signer<
        'info
    >,
    
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer.key(),
    )]
    pub nft_mint: Account<
        'info,
        Mint
    >,
    
    #[account(
        init,
        payer = payer,
        seeds = [b"nft-escrow", nft_mint.key().as_ref()],
        bump,
        space = NftEscrow::SPACE,
    )]
    pub escrow: Account<
        'info,
        NftEscrow
    >,
    
    #[account(mut)]
    pub pool: Account<
        'info,
        BondingCurvePool
    >,
    
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<
        'info
    >,
    
    /// CHECK: This is the metadata account that will be created
    #[account(mut)]
    pub metadata_account: UncheckedAccount<
        'info
    >,
    
    /// CHECK: This is the master edition account that will be created
    #[account(mut)]
    pub master_edition: UncheckedAccount<
        'info
    >,
    
    /// CHECK: This is the collection mint
    pub collection_mint: UncheckedAccount<
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

pub fn mint_nft(
    ctx: Context<MintNFT>,
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
) -> Result<()> {
    // Calculate price based on bonding curve
    let price = calculate_mint_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;
    
    // Check if pool is active
    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);
    
    // Calculate protocol fee (1%)
    let protocol_fee = price
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Calculate net price (price - protocol fee)
    let net_price = price
        .checked_sub(protocol_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Transfer SOL to escrow (net price)
    let transfer_to_escrow = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.payer.key(),
        &ctx.accounts.escrow.key(),
        net_price,
    );
    
    anchor_lang::solana_program::program::invoke(
        &transfer_to_escrow,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.escrow.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Transfer protocol fee to pool creator
    let transfer_to_creator = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.payer.key(),
        &ctx.accounts.pool.creator,
        protocol_fee,
    );
    
    anchor_lang::solana_program::program::invoke(
        &transfer_to_creator,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Initialize escrow
    ctx.accounts.escrow.nft_mint = ctx.accounts.nft_mint.key();
    ctx.accounts.escrow.lamports = net_price;
    ctx.accounts.escrow.last_price = price;
    ctx.accounts.escrow.bump = ctx.bumps.escrow;
    
    // Update pool
    ctx.accounts.pool.current_supply = ctx.accounts.pool.current_supply
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    
    ctx.accounts.pool.total_escrowed = ctx.accounts.pool.total_escrowed
        .checked_add(net_price)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Create metadata using real CPI
    let creator = vec![
        Creator {
            address: ctx.accounts.pool.creator,
            verified: false, // Typically, the creator isn't verified until later
            share: 100,
        },
    ];

    let metadata_accounts = CreateMetadataAccountV3CpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        update_authority: (&ctx.accounts.payer.to_account_info(), true), // Payer is the update authority
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&ctx.accounts.rent.to_account_info()),
    };

    let metadata_args = CreateMetadataAccountV3InstructionArgs {
        data: DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points,
            creators: Some(creator),
            collection: Some(Collection {
                verified: false, // Collection isn't verified at creation
                key: ctx.accounts.collection_mint.key(),
            }),
            uses: None,
        },
        is_mutable: true,
        collection_details: None, // Not a pNFT
    };

    CreateMetadataAccountV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        metadata_accounts,
        metadata_args
    ).invoke()?;
    
    // Create master edition using real CPI
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &ctx.accounts.master_edition.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        update_authority: &ctx.accounts.payer.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        token_program: &ctx.accounts.token_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&ctx.accounts.rent.to_account_info()),
    };

    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // 0 for non-fungible
    };

    CreateMasterEditionV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        master_edition_accounts,
        master_edition_args
    ).invoke()?;
    
    Ok(())
}

