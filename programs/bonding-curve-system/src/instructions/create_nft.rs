use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint};
use crate::state::{NFTData, UserAccount};
use mpl_token_metadata::types::{Creator, DataV2};
use mpl_token_metadata::instructions::{
    CreateMetadataAccountV3Cpi, 
    CreateMetadataAccountV3CpiAccounts,
    CreateMetadataAccountV3InstructionArgs,
    CreateMasterEditionV3Cpi,
    CreateMasterEditionV3CpiAccounts,
    CreateMasterEditionV3InstructionArgs
};

#[derive(Accounts)]
pub struct CreateNFT<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    // Changed from init to mut to allow using an existing mint account
    // This is critical for the token-minting-first approach
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    
    // Changed from init to init_if_needed to handle existing NFT data accounts
    #[account(
        init_if_needed,
        payer = creator,
        seeds = [b"nft-data", nft_mint.key().as_ref()],
        bump,
        space = NFTData::BASE_SIZE,
    )]
    pub nft_data: Account<'info, NFTData>,
    
    #[account(
        mut,
        seeds = [b"user-account", creator.key().as_ref()],
        bump,
        constraint = user_account.owner == creator.key(),
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    
    /// CHECK: Metadata account PDA
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    
    /// CHECK: Master edition account PDA
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,
}

pub fn create_nft(
    ctx: Context<CreateNFT>,
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
) -> Result<()> {
    // Add logging for verification
    msg!("NFT creation with init_if_needed constraint being executed");
    
    let nft_data = &mut ctx.accounts.nft_data;
    let bump = ctx.bumps.nft_data;
    
    // Initialize NFT data
    nft_data.creator = ctx.accounts.creator.key();
    nft_data.owner = ctx.accounts.creator.key();
    nft_data.name = name.clone();
    nft_data.symbol = symbol.clone();
    nft_data.uri = uri.clone();
    nft_data.collection_id = Pubkey::default(); // No collection for now
    nft_data.is_mutable = true;
    nft_data.primary_sale_happened = false;
    nft_data.seller_fee_basis_points = seller_fee_basis_points;
    nft_data.mint = ctx.accounts.nft_mint.key();
    nft_data.last_price = 0;
    nft_data.bump = bump;
    
    // Add NFT to user's owned NFTs
    let user = &mut ctx.accounts.user_account;
    user.owned_nfts.push(ctx.accounts.nft_mint.key());
    
    // Create Metaplex metadata
    let creator = vec![
        Creator {
            address: ctx.accounts.creator.key(),
            verified: true,
            share: 100,
        }
    ];
    
    // Create the DataV2 struct for metadata
    let data = DataV2 {
        name,
        symbol,
        uri,
        seller_fee_basis_points,
        creators: Some(creator),
        collection: None,
        uses: None,
    };
    
    let args = CreateMetadataAccountV3InstructionArgs {
        data,
        is_mutable: true,
        collection_details: None,
    };
    
    // Create longer-lived bindings for account infos to fix lifetime issues
    let metadata_account_info = ctx.accounts.metadata_account.to_account_info();
    let mint_account_info = ctx.accounts.nft_mint.to_account_info();
    let creator_account_info = ctx.accounts.creator.to_account_info();
    let system_program_info = ctx.accounts.system_program.to_account_info();
    let rent_account_info = ctx.accounts.rent.to_account_info();
    let token_metadata_program_info = ctx.accounts.token_metadata_program.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    let master_edition_account_info = ctx.accounts.master_edition_account.to_account_info();
    
    // Log account addresses for debugging
    msg!("Metadata account: {}", metadata_account_info.key());
    msg!("NFT mint: {}", mint_account_info.key());
    msg!("Creator: {}", creator_account_info.key());
    msg!("Token metadata program: {}", token_metadata_program_info.key());
    
    // Create metadata account using the Cpi struct
    let cpi_accounts = CreateMetadataAccountV3CpiAccounts {
        metadata: &metadata_account_info,
        mint: &mint_account_info,
        mint_authority: &creator_account_info,
        payer: &creator_account_info,
        update_authority: (&creator_account_info, true),
        system_program: &system_program_info,
        rent: Some(&rent_account_info),
    };
    
    // Create and invoke the CPI
    let metadata_cpi = CreateMetadataAccountV3Cpi::new(
        &token_metadata_program_info,
        cpi_accounts,
        args,
    );
    
    // Add try-catch equivalent for better error handling
    match metadata_cpi.invoke() {
        Ok(_) => msg!("Metadata account created successfully"),
        Err(err) => {
            msg!("Error creating metadata account: {:?}", err);
            return Err(err);
        }
    }
    
    // Create master edition account
    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // 0 means no printing allowed
    };
    
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &master_edition_account_info,
        mint: &mint_account_info,
        update_authority: &creator_account_info,
        mint_authority: &creator_account_info,
        payer: &creator_account_info,
        metadata: &metadata_account_info,
        token_program: &token_program_info,
        system_program: &system_program_info,
        rent: Some(&rent_account_info),
    };
    
    // Create and invoke the CPI
    let master_edition_cpi = CreateMasterEditionV3Cpi::new(
        &token_metadata_program_info,
        master_edition_accounts,
        master_edition_args,
    );
    
    // Add try-catch equivalent for better error handling
    match master_edition_cpi.invoke() {
        Ok(_) => msg!("Master edition account created successfully"),
        Err(err) => {
            msg!("Error creating master edition account: {:?}", err);
            return Err(err);
        }
    }
    
    msg!("NFT creation completed successfully");
    Ok(())
}
