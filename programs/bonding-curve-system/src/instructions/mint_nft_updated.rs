// Updated mint_nft.rs - Added MinterTracker and CollectionDistribution initialization

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token};
use mpl_token_metadata::instructions::{
    CreateMasterEditionV3Cpi, CreateMasterEditionV3CpiAccounts,
    CreateMasterEditionV3InstructionArgs, CreateMetadataAccountV3Cpi,
    CreateMetadataAccountV3CpiAccounts, CreateMetadataAccountV3InstructionArgs,
};
use mpl_token_metadata::types::{Collection, Creator, DataV2};

use crate::{
    errors::ErrorCode,
    math::price_calculation::calculate_mint_price,
    state::{BondingCurvePool, NftEscrow, MinterTracker, CollectionDistribution},
};

#[event]
pub struct NftMint {
    pub minter: Pubkey,
    pub nft_mint: Pubkey,
    pub pool: Pubkey,
    pub mint_price: u64,
    pub protocol_fee: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer.key(),
        mint::freeze_authority = payer.key()
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [b"nft-escrow", nft_mint.key().as_ref()],
        bump,
        space = NftEscrow::SPACE,
    )]
    pub escrow: Account<'info, NftEscrow>,

    #[account(
        init,
        payer = payer,
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump,
        space = MinterTracker::SPACE,
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"collection-distribution", collection_mint.key().as_ref()],
        bump,
        space = CollectionDistribution::SPACE,
    )]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    #[account(mut)]
    pub pool: Account<'info, BondingCurvePool>,

    /// CHECK: Token account for the payer/minter
    #[account(mut)]
    pub token_account: UncheckedAccount<'info>,

    /// CHECK: Token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,

    /// CHECK: Metadata account that will be created
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Master edition account that will be created
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    /// CHECK: Collection mint
    pub collection_mint: UncheckedAccount<'info>,

    /// CHECK: Collection metadata account
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// CHECK: Creator account from the pool
    #[account(mut, address = pool.creator)]
    pub creator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn mint_nft(
    ctx: Context<MintNFT>,
    name: String,
    symbol: String,
    uri: String,
    seller_fee_basis_points: u16,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;

    // Calculate pricing
    let price = calculate_mint_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;
    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);
    let protocol_fee = price.checked_div(100).ok_or(ErrorCode::MathOverflow)?;
    let net_price = price
        .checked_sub(protocol_fee)
        .ok_or(ErrorCode::MathOverflow)?;

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
            ctx.accounts.creator.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    // Initialize escrow
    ctx.accounts.escrow.nft_mint = ctx.accounts.nft_mint.key();
    ctx.accounts.escrow.lamports = net_price;
    ctx.accounts.escrow.last_price = price;
    ctx.accounts.escrow.bump = ctx.bumps.escrow;

    // Initialize minter tracker
    ctx.accounts.minter_tracker.nft_mint = ctx.accounts.nft_mint.key();
    ctx.accounts.minter_tracker.original_minter = ctx.accounts.payer.key();
    ctx.accounts.minter_tracker.minted_at = current_timestamp;
    ctx.accounts.minter_tracker.collection = ctx.accounts.collection_mint.key();
    ctx.accounts.minter_tracker.total_revenue_earned = 0;
    ctx.accounts.minter_tracker.sale_count = 0;
    ctx.accounts.minter_tracker.bump = ctx.bumps.minter_tracker;

    // Initialize or update collection distribution
    if ctx.accounts.collection_distribution.collection == Pubkey::default() {
        // First time initialization
        ctx.accounts.collection_distribution.collection = ctx.accounts.collection_mint.key();
        ctx.accounts.collection_distribution.total_nfts = 1;
        ctx.accounts.collection_distribution.accumulated_fees = 0;
        ctx.accounts.collection_distribution.last_distribution = current_timestamp;
        ctx.accounts.collection_distribution.total_distributed = 0;
        ctx.accounts.collection_distribution.distribution_count = 0;
        ctx.accounts.collection_distribution.bump = ctx.bumps.collection_distribution;
    } else {
        // Increment NFT count for existing collection
        ctx.accounts.collection_distribution.increment_nft_count();
    }

    // Update pool
    ctx.accounts.pool.current_supply = ctx
        .accounts
        .pool
        .current_supply
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    ctx.accounts.pool.total_escrowed = ctx
        .accounts
        .pool
        .total_escrowed
        .checked_add(net_price)
        .ok_or(ErrorCode::MathOverflow)?;

    // Create NFT metadata
    let creator_pda = vec![Creator {
        address: ctx.accounts.pool.creator,
        verified: false,
        share: 100,
    }];

    let metadata_accounts = CreateMetadataAccountV3CpiAccounts {
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        update_authority: (&ctx.accounts.payer.to_account_info(), true),
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&ctx.accounts.rent.to_account_info()),
    };

    let metadata_args = CreateMetadataAccountV3InstructionArgs {
        data: DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points,
            creators: Some(creator_pda),
            collection: Some(Collection {
                verified: false,
                key: ctx.accounts.collection_mint.key(),
            }),
            uses: None,
        },
        is_mutable: true,
        collection_details: None,
    };

    CreateMetadataAccountV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        metadata_accounts,
        metadata_args,
    )
    .invoke()?;

    // Create associated token account
    anchor_spl::associated_token::create(CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        anchor_spl::associated_token::Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
            mint: ctx.accounts.nft_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        },
    ))?;

    // Mint token
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.nft_mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        1,
    )?;

    // Create master edition
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &ctx.accounts.master_edition.to_account_info(),
        mint: &ctx.accounts.nft_mint.to_account_info(),
        update_authority: &ctx.accounts.payer.to_account_info(),
        mint_authority: &ctx.accounts.payer.to_account_info(),
        payer: &ctx.accounts.payer.to_account_info(),
        metadata: &ctx.accounts.metadata_account.to_account_info(),
        token_program: &ctx.accounts.token_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
        rent: Some(&ctx.accounts.rent.to_account_info()),
    };

    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0),
    };

    CreateMasterEditionV3Cpi::new(
        &ctx.accounts.token_metadata_program.to_account_info(),
        master_edition_accounts,
        master_edition_args,
    )
    .invoke()?;

    // Emit event
    emit!(NftMint {
        minter: ctx.accounts.payer.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        pool: ctx.accounts.pool.key(),
        mint_price: price,
        protocol_fee: protocol_fee,
        timestamp: current_timestamp,
    });

    msg!("NFT minted successfully with minter tracking!");
    msg!("Original Minter: {}", ctx.accounts.payer.key());
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Collection: {}", ctx.accounts.collection_mint.key());

    Ok(())
}

