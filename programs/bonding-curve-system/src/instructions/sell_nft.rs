use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use mpl_token_metadata::instruction::burn_nft;

use crate::{
    state::{BondingCurvePool, NftEscrow},
    errors::ErrorCode,
    math::price_calculation::{calculate_sell_price},
};

#[derive(Accounts)]
pub struct SellNFT<\'info> {
    #[account(mut)]
    pub seller: Signer<\'info>,
    
    #[account(mut)]
    pub pool: Account<\'info, BondingCurvePool>,
    
    #[account(
        mut,
        seeds = [b"nft-escrow", nft_mint.key().as_ref()],
        bump = escrow.bump,
        close = seller // Close the escrow account and return rent to the seller
    )]
    pub escrow: Account<\'info, NftEscrow>,
    
    #[account(mut)]
    pub nft_mint: Account<\'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller
    )]
    pub seller_nft_token_account: Account<\'info, TokenAccount>,
    
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<\'info>,
    
    /// CHECK: This is the metadata account associated with the NFT
    #[account(mut)]
    pub metadata_account: UncheckedAccount<\'info>,
    
    /// CHECK: This is the master edition account associated with the NFT
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<\'info>,
    
    /// CHECK: This is the collection mint
    pub collection_mint: UncheckedAccount<\'info>,
    
    pub token_program: Program<\'info, Token>,
    pub system_program: Program<\'info, System>,
}

pub fn sell_nft(ctx: Context<SellNFT>) -> Result<()> {
    // Calculate sell price (price for supply - 1)
    let price = calculate_sell_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;
    
    // Check if pool is active
    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);
    
    // Ensure the escrow holds the expected amount (or more, though ideally exact)
    // This acts as a safety check
    require!(ctx.accounts.escrow.lamports >= price, ErrorCode::InsufficientEscrowBalance);
    
    // Burn the NFT using Metaplex burn_nft instruction
    let burn_accounts = vec![
        ctx.accounts.metadata_account.to_account_info(),
        ctx.accounts.seller.to_account_info(),
        ctx.accounts.nft_mint.to_account_info(),
        ctx.accounts.seller_nft_token_account.to_account_info(),
        ctx.accounts.master_edition_account.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        // Optional SPL Token Account can be added here if needed by burn_nft
        // Optional Edition Marker Account can be added here if needed by burn_nft
        ctx.accounts.collection_mint.to_account_info(), // Pass collection mint
    ];
    
    let burn_instruction = burn_nft(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata_account.key(),
        ctx.accounts.seller.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.seller_nft_token_account.key(),
        ctx.accounts.master_edition_account.key(),
        ctx.accounts.token_program.key(),
        None, // spl_token_account
        None, // edition_marker_account
        Some(ctx.accounts.collection_mint.key()), // Use collection metadata for burning
    );

    anchor_lang::solana_program::program::invoke(
        &burn_instruction,
        &burn_accounts,
    )?;

    // Transfer SOL from escrow to seller
    // The escrow account holds `escrow.lamports`. We return the calculated `price`.
    // The remaining lamports in the escrow account (rent + any excess) will be
    // returned to the `seller` automatically when the account is closed.
    let escrow_lamports = ctx.accounts.escrow.to_account_info().lamports();
    **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? = 0;
    **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.seller.to_account_info().lamports()
        .checked_add(escrow_lamports)
        .ok_or(ErrorCode::MathOverflow)?;

    // Update pool state
    ctx.accounts.pool.current_supply = ctx.accounts.pool.current_supply
        .checked_sub(1)
        .ok_or(ErrorCode::MathOverflow)?;
        
    ctx.accounts.pool.total_escrowed = ctx.accounts.pool.total_escrowed
        .checked_sub(price) // Subtract the price returned to user
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}

