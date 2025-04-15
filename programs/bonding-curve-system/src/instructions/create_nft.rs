use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint};
use crate::state::{NFTData, UserAccount};

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
    nft_data.name = name;
    nft_data.symbol = symbol;
    nft_data.uri = uri;
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
    
    Ok(())
}
