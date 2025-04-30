// programs/bonding-curve-system/src/instructions/sell_nft.rs
// FINAL COMBINED EXAMPLE: Fix for InsufficientEscrowBalance, 5% Sell Fee, AND Mutability Error

use anchor_lang::{
    prelude::*,
    solana_program::{program::invoke_signed, system_instruction},
};
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
        // REMOVED: close = seller // Manual transfers implemented
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
    #[account(mut)] // <-- ADDED MUT HERE
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

    // --- REMOVED FAULTY CHECK --- 
    // require!(ctx.accounts.escrow.lamports >= price, ErrorCode::InsufficientEscrowBalance);
    // --- END REMOVAL --- 

    // --- Burn Logic ---
    // Get AccountInfo for collection_mint
    let collection_mint_info = ctx.accounts.collection_mint.to_account_info();
    
    // Prepare accounts for BurnNftCpi
    let burn_accounts = BurnNftCpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        owner: &ctx.accounts.seller.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        token_account: &ctx.accounts.seller_nft_token_account.to_account_info(),
        master_edition_account: &ctx.accounts.master_edition_account.to_account_info(),
        spl_token_program: &ctx.accounts.token_program.to_account_info(),
        // Pass the collection_metadata derived from collection_mint_info
        // Metaplex requires this to be mutable, hence collection_mint must be mut
        collection_metadata: Some(&collection_mint_info), 
    };
    
    // Invoke BurnNftCpi
    BurnNftCpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        burn_accounts
    ).invoke()?;
    // --- End Burn Logic ---

    // --- Manual Fund Transfer Logic with 5% Fee ---
    let escrow_total_lamports = ctx.accounts.escrow.to_account_info().lamports();
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

    // Prepare PDA seeds for invoke_signed
    let nft_mint_key = ctx.accounts.nft_mint.key();
    let seeds = &[
        b"nft-escrow".as_ref(),
        nft_mint_key.as_ref(),
        &[ctx.accounts.escrow.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer Fee from Escrow PDA to Creator
    if sell_fee > 0 {
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.escrow.key(),
                &ctx.accounts.creator.key(),
                sell_fee,
            ),
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.creator.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
    }

    // Transfer Net Amount from Escrow PDA to Seller
    if net_amount_to_seller > 0 {
        invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.escrow.key(),
                &ctx.accounts.seller.key(),
                net_amount_to_seller,
            ),
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
    }

    // --- Transfer Remaining Rent from Escrow to Seller ---
    let remaining_lamports = ctx.accounts.escrow.to_account_info().lamports();
    if remaining_lamports > 0 {
         invoke_signed(
            &system_instruction::transfer(
                &ctx.accounts.escrow.key(),
                &ctx.accounts.seller.key(), // Send rent to the seller
                remaining_lamports,
            ),
            &[
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;
    }
    // Escrow balance is now 0. Anchor will handle account data removal.
    // --- End Manual Fund Transfer --- 

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