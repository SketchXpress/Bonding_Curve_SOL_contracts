// programs/bonding-curve-system/src/instructions/sell_nft.rs
// Refined to include pool and timestamp in NftSale event

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use mpl_token_metadata::instructions::{BurnNftCpi, BurnNftCpiAccounts};

use crate::{
    errors::ErrorCode,
    math::price_calculation::calculate_sell_price,
    state::{BondingCurvePool, NftEscrow},
};

#[event]
pub struct NftSale {
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub pool: Pubkey,    // Address of the BondingCurvePool
    pub sale_price: u64, // Net lamports received by seller (after creator's fee, before rent reclaim)
    pub sell_fee: u64,   // Lamports taken from escrow for pool creator
    pub timestamp: i64,  // On-chain Unix timestamp of the sale event
}

#[derive(Accounts)]
pub struct SellNFT<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, BondingCurvePool>,

    #[account(
        mut,
        seeds = [b"nft-escrow", nft_mint.key().as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, NftEscrow>,

    /// CHECK: This is safe because the address is constrained to `pool.creator`
    #[account(mut, address = pool.creator)]
    pub creator: UncheckedAccount<'info>,

    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = seller
    )]
    pub seller_nft_token_account: Account<'info, TokenAccount>,

    #[account(address = mpl_token_metadata::ID)]
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is the metadata account associated with the NFT
    pub metadata_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is the master edition account associated with the NFT
    pub master_edition_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is the collection mint account.
    pub collection_mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: This is the collection metadata account
    pub collection_metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_nft(ctx: Context<SellNFT>) -> Result<()> {
    let pool_account = &ctx.accounts.pool;
    let price = calculate_sell_price(
        pool_account.base_price,
        pool_account.growth_factor,
        pool_account.current_supply,
    )?;

    require!(pool_account.is_active, ErrorCode::PoolInactive);

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
        burn_accounts,
    )
    .invoke()?;

    let escrow_info = ctx.accounts.escrow.to_account_info();
    let creator_info = ctx.accounts.creator.to_account_info();
    let seller_info = ctx.accounts.seller.to_account_info();

    let escrow_total_lamports = escrow_info.lamports();
    let rent_exempt_minimum = Rent::get()?.minimum_balance(NftEscrow::SPACE);

    let available_lamports = escrow_total_lamports
        .checked_sub(rent_exempt_minimum)
        .unwrap_or(0);

    let sell_fee_calculated = available_lamports
        .checked_mul(5) // Assuming 5% fee, this should be configurable or from pool state if dynamic
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?;

    let net_amount_to_seller_calculated = available_lamports
        .checked_sub(sell_fee_calculated)
        .ok_or(ErrorCode::MathOverflow)?;

    let total_payout_amount = sell_fee_calculated
        .checked_add(net_amount_to_seller_calculated)
        .ok_or(ErrorCode::MathOverflow)?;

    if escrow_total_lamports
        < total_payout_amount
            .checked_add(rent_exempt_minimum)
            .ok_or(ErrorCode::MathOverflow)?
    {
        return err!(ErrorCode::InsufficientEscrowBalance);
    }

    let final_amount_to_seller_transfer = net_amount_to_seller_calculated
        .checked_add(rent_exempt_minimum)
        .ok_or(ErrorCode::MathOverflow)?;

    let nft_mint_key = ctx.accounts.nft_mint.key();
    let escrow_bump = ctx.accounts.escrow.bump;
    let seeds = &[
        b"nft-escrow".as_ref(),
        nft_mint_key.as_ref(),
        &[escrow_bump],
    ];

    let escrow_account_info_for_zeroing = ctx.accounts.escrow.to_account_info();
    let mut escrow_data = escrow_account_info_for_zeroing.try_borrow_mut_data()?;
    escrow_data.fill(0);
    drop(escrow_data);

    if sell_fee_calculated > 0 {
        **escrow_info.try_borrow_mut_lamports()? -= sell_fee_calculated;
        **creator_info.try_borrow_mut_lamports()? += sell_fee_calculated;
    }

    if final_amount_to_seller_transfer > 0 {
        **escrow_info.try_borrow_mut_lamports()? -= final_amount_to_seller_transfer;
        **seller_info.try_borrow_mut_lamports()? += final_amount_to_seller_transfer;
    }

    if escrow_info.lamports() != 0 {
        msg!(
            "Error: Escrow account not fully drained. Remaining lamports: {}",
            escrow_info.lamports()
        );
        return err!(ErrorCode::EscrowNotEmpty);
    }

    ctx.accounts.pool.current_supply = ctx
        .accounts
        .pool
        .current_supply
        .checked_sub(1)
        .ok_or(ErrorCode::MathOverflow)?;
    ctx.accounts.pool.total_escrowed = ctx
        .accounts
        .pool
        .total_escrowed
        .checked_sub(price)
        .ok_or(ErrorCode::MathOverflow)?;

    emit!(NftSale {
        seller: ctx.accounts.seller.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        pool: ctx.accounts.pool.key(),
        sale_price: net_amount_to_seller_calculated,
        sell_fee: sell_fee_calculated,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
