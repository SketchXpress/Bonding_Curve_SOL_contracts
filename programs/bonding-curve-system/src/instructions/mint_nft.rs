// Revised fixes for mint_nft.rs - Keeping Master Edition while adding ATA creation

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken; // Import AssociatedToken program
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
        mint::freeze_authority = payer.key() // Optional: Set freeze authority
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

    /// CHECK: This is the token account for the payer/minter. 
    /// It will be created by the AssociatedToken program if it doesn't exist.
    #[account(mut)]
    pub token_account: UncheckedAccount<
        'info
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
    
     /// CHECK: This is the collection metadata account
     #[account(mut)]
     pub collection_metadata: UncheckedAccount<'info>,
     
    pub token_program: Program<
        'info,
        Token
    >,

    // Associated Token Program required for creating the token account
    pub associated_token_program: Program<
        'info,
        AssociatedToken
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
    // --- Pricing and Pool Logic (Keep as is) ---
    let price = calculate_mint_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;
    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);
    let protocol_fee = price.checked_div(100).ok_or(ErrorCode::MathOverflow)?;
    let net_price = price.checked_sub(protocol_fee).ok_or(ErrorCode::MathOverflow)?;
    
    // Transfer SOL to escrow
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
    ctx.accounts.pool.current_supply = ctx.accounts.pool.current_supply.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    ctx.accounts.pool.total_escrowed = ctx.accounts.pool.total_escrowed.checked_add(net_price).ok_or(ErrorCode::MathOverflow)?;
    // --- End Pricing and Pool Logic ---
    
    // --- NFT Creation Logic --- 
    // Create metadata using CPI
    let creator = vec![
        Creator {
            address: ctx.accounts.pool.creator,
            verified: false, 
            share: 100,
        },
    ];
    let rent_account_info = ctx.accounts.rent.to_account_info();
    let metadata_accounts = CreateMetadataAccountV3CpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        update_authority: (&ctx.accounts.payer.to_account_info(), true), 
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&rent_account_info),
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
        collection_details: None, // Not a collection NFT
    };
    CreateMetadataAccountV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        metadata_accounts,
        metadata_args
    ).invoke()?;

    // STEP 1: Create the Associated Token Account for the payer
    msg!("Creating Associated Token Account for NFT via CPI");
    anchor_spl::associated_token::create(
        CpiContext::new(
            ctx.accounts.associated_token_program.to_account_info(),
            anchor_spl::associated_token::Create {
                payer: ctx.accounts.payer.to_account_info(),
                associated_token: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(), // Payer owns the ATA
                mint: ctx.accounts.nft_mint.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        )
    )?;

    // STEP 2: Mint exactly one token to the payer's token account
    msg!("Minting one token to the Associated Token Account");
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(), // Payer is the mint authority
            },
        ),
        1, // Amount = 1
    )?;

    // STEP 3: Now that we have exactly one token, create the Master Edition
    // Create master edition using real CPI
    let rent_account_info_for_master = ctx.accounts.rent.to_account_info();
    
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &ctx.accounts.master_edition.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        update_authority: &ctx.accounts.payer.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        token_program: &ctx.accounts.token_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&rent_account_info_for_master),
    };

    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // 0 for non-fungible
    };

    CreateMasterEditionV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        master_edition_accounts,
        master_edition_args
    ).invoke()?;
    
    msg!("NFT minted successfully with Master Edition!");
    msg!("NFT Mint Address: {}", ctx.accounts.nft_mint.key());
    msg!("NFT Token Account: {}", ctx.accounts.token_account.key());
    msg!("Master Edition Address: {}", ctx.accounts.master_edition.key());

    Ok(())
}


