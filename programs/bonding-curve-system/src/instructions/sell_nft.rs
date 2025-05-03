// programs/bonding-curve-system/src/instructions/sell_nft.rs
// FINAL FIX v6: Fix escaped quotes and compilation errors

use anchor_lang::prelude::*;
use anchor_lang::system_program; // Import system_program module
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
        // REMOVED: close = seller // We will handle closing manually via lamport transfer
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

    /// CHECK: This is the collection metadata account
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,


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
    // let collection_mint_info = ctx.accounts.collection_mint.to_account_info();

    // Create a binding for the collection metadata account info
    let collection_metadata_info = ctx.accounts.collection_metadata.to_account_info();
    
    let burn_accounts = BurnNftCpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        owner: &ctx.accounts.seller.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        token_account: &ctx.accounts.seller_nft_token_account.to_account_info(),
        master_edition_account: &ctx.accounts.master_edition_account.to_account_info(),
        spl_token_program: &ctx.accounts.token_program.to_account_info(),
        collection_metadata: Some(&collection_metadata_info),
    };

    BurnNftCpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        burn_accounts
    ).invoke()?; // Seller mutable borrow ends here
    // --- End Burn Logic ---

    // --- Explicit Lamport Transfer Logic using System Program --- 
    let escrow_info = ctx.accounts.escrow.to_account_info();
    let creator_info = ctx.accounts.creator.to_account_info();
    let seller_info = ctx.accounts.seller.to_account_info(); // Seller is NOT mutably borrowed yet

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

    // Calculate total amount to transfer out to creator and seller (excluding rent)
    let total_payout_amount = sell_fee
        .checked_add(net_amount_to_seller)
        .ok_or(ErrorCode::MathOverflow)?;

    // Ensure escrow has enough lamports to cover the payout AND the rent minimum
    if escrow_total_lamports < total_payout_amount.checked_add(rent_exempt_minimum).ok_or(ErrorCode::MathOverflow)? {
         return err!(ErrorCode::InsufficientEscrowBalance); 
    }

    // Calculate the final amount to transfer to the seller (net amount + rent)
    let final_amount_to_seller = net_amount_to_seller
        .checked_add(rent_exempt_minimum)
        .ok_or(ErrorCode::MathOverflow)?;

    // Prepare PDA seeds for signing the transfer from escrow
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let seeds = &[b"nft-escrow".as_ref(), nft_mint_key.as_ref(), &[ctx.accounts.escrow.bump]];
    let signer_seeds = &[&seeds[..]];

    // Manually zero out the escrow account data BEFORE transfer, as required by System Program
    // Borrow data from the Account's underlying AccountInfo
    // Create a longer-lived binding for the AccountInfo as suggested by E0716
    let escrow_account_info_for_zeroing = ctx.accounts.escrow.to_account_info();
    let mut escrow_data = escrow_account_info_for_zeroing.try_borrow_mut_data()?;
    escrow_data.fill(0);
    // Drop the mutable borrow explicitly before the transfer CPIs
    drop(escrow_data);

    // 1. Transfer Fee to Creator (if fee > 0)
    if sell_fee > 0 {
        let cpi_context_fee = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: escrow_info.clone(), // Escrow is payer
                to: creator_info.clone(),   // Creator is recipient
            },
            signer_seeds,
        );
        system_program::transfer(cpi_context_fee, sell_fee)?;
    }

    // 2. Transfer Remaining Lamports (Net Amount + Rent) to Seller
    if final_amount_to_seller > 0 {
        let cpi_context_seller = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: escrow_info.clone(), // Escrow is payer
                to: seller_info.clone(),   // Seller is recipient
            },
            signer_seeds,
        );
        system_program::transfer(cpi_context_seller, final_amount_to_seller)?;
    }
    // Post-transfer check: Check escrow lamports again after transfers
    // No need for reload(), AccountInfo lamports should be updated after CPI
    if escrow_info.lamports() != 0 {
        // This shouldn't happen if calculations are correct, but good safety check
        msg!("Error: Escrow account not fully drained. Remaining lamports: {}", escrow_info.lamports());
        return err!(ErrorCode::EscrowNotEmpty);
    }  // --- End Explicit Lamport Transfer --- 

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

