// programs/bonding-curve-system/src/instructions/sell_nft.rs
// FINAL FIX v2: Fixes InsufficientEscrowBalance, 5% Sell Fee, Mutability Error, AND Transfer Error

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use mpl_token_metadata::instructions::{
    BurnNftCpi,
    BurnNftCpiAccounts
};

use crate::{
    state::{BondingCurvePool, NftEscrow},
    errors::ErrorCode,
    math::price_calculation::calculate_sell_price,
};

#[derive(Accounts)]
pub struct SellNFT<
    'info
> {
    #[account(mut)]
    pub seller: Signer<
        'info
    >,

    #[account(mut)]
    pub pool: Account<
        'info,
        BondingCurvePool
    >,

    #[account(
        mut,
        seeds = [b"nft-escrow", nft_mint.key().as_ref()],
        bump = escrow.bump,
        // Account will be zeroed out and closed by Anchor automatically at end of instruction
        close = seller
    )]
    pub escrow: Account<
        'info,
        NftEscrow
    >,

    // Creator account to receive the fee
    /// CHECK: Creator account from the pool, needs to be mutable to receive funds.
    #[account(mut, address = pool.creator)]
    pub creator: UncheckedAccount<
        'info
    >,

    #[account(mut)]
    pub nft_mint: Account<
        'info,
        Mint
    >,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller
    )]
    pub seller_nft_token_account: Account<
        'info,
        TokenAccount
    >,

    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<
        'info
    >,

    /// CHECK: This is the metadata account associated with the NFT
    #[account(mut)]
    pub metadata_account: UncheckedAccount<
        'info
    >,

    /// CHECK: This is the master edition account associated with the NFT
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<
        'info
    >,

    // Collection Mint - Needs to be mutable for BurnNftCpi
    /// CHECK: This is the collection mint account.
    #[account(mut)]
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
}

pub fn sell_nft(ctx: Context<SellNFT>) -> Result<()> {
    // Calculate theoretical sell price (used for pool tracking, not payout)
    let price = calculate_sell_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;

    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);

    // --- Burn Logic (remains the same) ---
    let collection_mint_info = ctx.accounts.collection_mint.to_account_info();
    let burn_accounts = BurnNftCpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        owner: &ctx.accounts.seller.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        token_account: &ctx.accounts.seller_nft_token_account.to_account_info(),
        master_edition_account: &ctx.accounts.master_edition_account.to_account_info(),
        spl_token_program: &ctx.accounts.token_program.to_account_info(),
        collection_metadata: Some(&collection_mint_info), 
    };
    BurnNftCpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        burn_accounts
    ).invoke()?;
    // --- End Burn Logic ---

    // --- Direct Lamport Transfer Logic with 5% Fee ---
    // Create longer-lived bindings for the account_info objects
    let escrow_info = ctx.accounts.escrow.to_account_info();
    let creator_info = ctx.accounts.creator.to_account_info();
    let seller_info = ctx.accounts.seller.to_account_info();

    // Get escrow total lamports before any changes
    let escrow_total_lamports = escrow_info.lamports();
    let rent_exempt_minimum = Rent::get()?.minimum_balance(NftEscrow::SPACE);

    // Calculate available lamports (excluding rent)
    let available_lamports = escrow_total_lamports.checked_sub(rent_exempt_minimum).unwrap_or(0);

    // Calculate 5% fee on available lamports
    let sell_fee = available_lamports
        .checked_mul(5)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?;

    // Calculate net amount for seller (from available lamports)
    let net_amount_to_seller = available_lamports
        .checked_sub(sell_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Calculate total amount to transfer out
    let total_transfer_amount = sell_fee
        .checked_add(net_amount_to_seller)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Ensure we don't try to transfer more than exists
    if total_transfer_amount > escrow_total_lamports {
        return err!(ErrorCode::InsufficientEscrowBalance);
    }

    // Now borrow mutably from the longer-lived bindings
    let mut escrow_lamports = escrow_info.try_borrow_mut_lamports()?;
    let mut creator_lamports = creator_info.try_borrow_mut_lamports()?;
    let mut seller_lamports = seller_info.try_borrow_mut_lamports()?;

    // Perform transfers using direct lamport manipulation
    **escrow_lamports = escrow_lamports.checked_sub(total_transfer_amount).ok_or(ErrorCode::MathOverflow)?;
    
    if sell_fee > 0 {
        **creator_lamports = creator_lamports.checked_add(sell_fee).ok_or(ErrorCode::MathOverflow)?;
    }
    
    // Seller receives net amount
    if net_amount_to_seller > 0 {
        **seller_lamports = seller_lamports.checked_add(net_amount_to_seller).ok_or(ErrorCode::MathOverflow)?;
    }
    
    // Note: The rent exemption lamports will be returned to the seller automatically
    // because we've specified `close = seller` in the account constraints
    // --- End Direct Lamport Transfer --- 

    // --- Update Pool State (remains the same) ---
    ctx.accounts.pool.current_supply = ctx.accounts.pool.current_supply
        .checked_sub(1)
        .ok_or(ErrorCode::MathOverflow)?;

    // Still subtract the theoretical `price` from total_escrowed for pool tracking consistency
    ctx.accounts.pool.total_escrowed = ctx.accounts.pool.total_escrowed
        .checked_sub(price) 
        .ok_or(ErrorCode::MathOverflow)?;

    Ok(())
}
