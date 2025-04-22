use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint};
use crate::state::{NFTData, UserAccount};
use mpl_token_metadata::instruction::{create_metadata_accounts_v3, create_master_edition_v3};

#[derive(Accounts)]
pub struct CreateNFT<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        mint::decimals = 0,
        mint::authority = creator,
    )]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        init,
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
        mpl_token_metadata::state::Creator {
            address: ctx.accounts.creator.key(),
            verified: true,
            share: 100,
        }
    ];
    
    // Create metadata account
    let cpi_accounts = mpl_token_metadata::cpi::accounts::CreateMetadataAccountsV3 {
        metadata: ctx.accounts.metadata_account.to_account_info(),
        mint: ctx.accounts.nft_mint.to_account_info(),
        mint_authority: ctx.accounts.creator.to_account_info(),
        payer: ctx.accounts.creator.to_account_info(),
        update_authority: ctx.accounts.creator.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        cpi_accounts,
    );
    
    mpl_token_metadata::cpi::create_metadata_accounts_v3(
        cpi_ctx,
        name,
        symbol,
        uri,
        Some(creator),
        seller_fee_basis_points,
        true, // is_mutable
        false, // freeze_authority
        None, // collection
        None, // uses
        None, // collection_details
    )?;
    
    // Create master edition account
    let cpi_accounts = mpl_token_metadata::cpi::accounts::CreateMasterEditionV3 {
        edition: ctx.accounts.master_edition_account.to_account_info(),
        mint: ctx.accounts.nft_mint.to_account_info(),
        update_authority: ctx.accounts.creator.to_account_info(),
        mint_authority: ctx.accounts.creator.to_account_info(),
        payer: ctx.accounts.creator.to_account_info(),
        metadata: ctx.accounts.metadata_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        cpi_accounts,
    );
    
    mpl_token_metadata::cpi::create_master_edition_v3(
        cpi_ctx,
        Some(0), // max_supply: 0 means no printing allowed
    )?;
    
    Ok(())
}
