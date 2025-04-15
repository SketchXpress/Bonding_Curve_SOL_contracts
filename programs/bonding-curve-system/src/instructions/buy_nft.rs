use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{NFTData, UserAccount};

#[derive(Accounts)]
pub struct BuyNFT<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user-account", buyer.key().as_ref()],
        bump,
        constraint = buyer_account.owner == buyer.key(),
    )]
    pub buyer_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"user-account", nft_data.owner.as_ref()],
        bump,
        constraint = seller_account.owner == nft_data.owner,
    )]
    pub seller_account: Account<'info, UserAccount>,
    
    #[account(
        mut,
        seeds = [b"nft-data", nft_mint.key().as_ref()],
        bump = nft_data.bump,
        constraint = !nft_data.primary_sale_happened || nft_data.is_mutable,
    )]
    pub nft_data: Account<'info, NFTData>,
    
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = nft_data.owner,
    )]
    pub seller_nft_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_nft_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> {
    let nft_data = &mut ctx.accounts.nft_data;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let seller_account = &mut ctx.accounts.seller_account;
    
    // Set price based on whether it's a primary sale or secondary sale
    let price = if !nft_data.primary_sale_happened {
        // Primary sale - fixed price
        1_000_000_000 // 1 SOL in lamports
    } else {
        // Secondary sale - 10% increase from last price
        nft_data.last_price
            .checked_mul(110)
            .ok_or::<anchor_lang::error::Error>(crate::errors::ErrorCode::MathOverflow.into())?
            .checked_div(100)
            .ok_or::<anchor_lang::error::Error>(crate::errors::ErrorCode::MathOverflow.into())?
    };
    
    // Transfer SOL from buyer to seller
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.seller_account.to_account_info(),
        },
    );
    
    anchor_lang::system_program::transfer(cpi_context, price)?;
    
    // Transfer NFT from seller to buyer
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.seller_nft_token_account.to_account_info(),
                to: ctx.accounts.buyer_nft_token_account.to_account_info(),
                authority: ctx.accounts.seller_account.to_account_info(),
            },
        ),
        1, // NFTs have amount of 1
    )?;
    
    // Update NFT data
    nft_data.owner = ctx.accounts.buyer.key();
    nft_data.primary_sale_happened = true;
    nft_data.last_price = price;
    
    // Update buyer's owned NFTs
    buyer_account.owned_nfts.push(ctx.accounts.nft_mint.key());
    
    // Remove NFT from seller's owned NFTs
    let nft_key = ctx.accounts.nft_mint.key();
    if let Some(index) = seller_account.owned_nfts.iter().position(|&x| x == nft_key) {
        seller_account.owned_nfts.remove(index);
    }
    
    Ok(())
}
