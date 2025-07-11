use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{
    errors::ErrorCode,
    state::{CollectionDistribution, MinterTracker},
};

#[event]
pub struct CollectionFeesDistributed {
    pub collection: Pubkey,
    pub total_distributed: u64,
    pub per_nft_amount: u64,
    pub total_nfts: u32,
    pub distribution_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct NftHolderPayout {
    pub nft_mint: Pubkey,
    pub holder: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct DistributeCollectionFees<'info> {
    /// The payer for transaction fees
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Collection mint
    pub collection_mint: Account<'info, anchor_spl::token::Mint>,

    /// Collection distribution account
    #[account(
        mut,
        seeds = [b"collection-distribution", collection_mint.key().as_ref()],
        bump = collection_distribution.bump,
        constraint = collection_distribution.accumulated_fees > 0 @ ErrorCode::InsufficientFunds,
    )]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimNftHolderFees<'info> {
    /// The NFT holder claiming fees
    #[account(mut)]
    pub holder: Signer<'info>,

    /// The NFT mint
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,

    /// Holder's token account (must own the NFT)
    #[account(
        constraint = holder_token_account.mint == nft_mint.key(),
        constraint = holder_token_account.owner == holder.key(),
        constraint = holder_token_account.amount == 1 @ ErrorCode::InsufficientNftBalance
    )]
    pub holder_token_account: Account<'info, TokenAccount>,

    /// Minter tracker to get collection info
    #[account(
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump = minter_tracker.bump,
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// Collection distribution account
    #[account(
        mut,
        seeds = [b"collection-distribution", minter_tracker.collection.as_ref()],
        bump = collection_distribution.bump,
    )]
    pub collection_distribution: Account<'info, CollectionDistribution>,

    /// NFT holder fee claim tracker
    #[account(
        init_if_needed,
        payer = holder,
        seeds = [b"fee-claim", nft_mint.key().as_ref(), collection_distribution.distribution_count.to_le_bytes().as_ref()],
        bump,
        space = NftHolderFeeClaim::SPACE,
    )]
    pub fee_claim: Account<'info, NftHolderFeeClaim>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct NftHolderFeeClaim {
    pub nft_mint: Pubkey,
    pub holder: Pubkey,
    pub distribution_round: u32,
    pub amount_claimed: u64,
    pub claimed_at: i64,
    pub bump: u8,
}

impl NftHolderFeeClaim {
    pub const SPACE: usize = 8 + // discriminator
        32 + // nft_mint
        32 + // holder
        4 +  // distribution_round
        8 +  // amount_claimed
        8 +  // claimed_at
        1;   // bump
}

pub fn distribute_collection_fees(
    ctx: Context<DistributeCollectionFees>,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let collection_distribution = &mut ctx.accounts.collection_distribution;

    // Check if there are fees to distribute
    require!(
        collection_distribution.accumulated_fees > 0,
        ErrorCode::InsufficientFunds
    );

    // Check if there are NFTs in the collection
    require!(
        collection_distribution.total_nfts > 0,
        ErrorCode::InvalidAmount
    );

    // Calculate per-NFT distribution amount
    let per_nft_amount = collection_distribution.get_per_nft_distribution();
    let total_to_distribute = per_nft_amount
        .checked_mul(collection_distribution.total_nfts as u64)
        .ok_or(ErrorCode::MathOverflow)?;

    // Update collection distribution state
    let distributed_amount = collection_distribution.distribute_fees(current_timestamp);

    // Emit event
    emit!(CollectionFeesDistributed {
        collection: ctx.accounts.collection_mint.key(),
        total_distributed: total_to_distribute,
        per_nft_amount: distributed_amount,
        total_nfts: collection_distribution.total_nfts,
        distribution_count: collection_distribution.distribution_count,
        timestamp: current_timestamp,
    });

    msg!("Collection fees distributed successfully!");
    msg!("Collection: {}", ctx.accounts.collection_mint.key());
    msg!("Total distributed: {} lamports", total_to_distribute);
    msg!("Per NFT amount: {} lamports", distributed_amount);
    msg!("Total NFTs: {}", collection_distribution.total_nfts);
    msg!("Distribution round: {}", collection_distribution.distribution_count);

    Ok(())
}

pub fn claim_nft_holder_fees(
    ctx: Context<ClaimNftHolderFees>,
) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;
    let collection_distribution = &ctx.accounts.collection_distribution;
    let fee_claim = &mut ctx.accounts.fee_claim;

    // Check if this NFT holder has already claimed for this distribution round
    if fee_claim.nft_mint != Pubkey::default() {
        require!(
            fee_claim.distribution_round < collection_distribution.distribution_count,
            ErrorCode::InvalidAmount
        );
    }

    // Calculate claimable amount (per NFT distribution from last round)
    let per_nft_amount = collection_distribution.get_per_nft_distribution();
    
    // For simplicity, we'll allow claiming from the accumulated pool
    // In a production system, you'd track per-distribution-round amounts
    require!(
        per_nft_amount > 0,
        ErrorCode::InsufficientFunds
    );

    // Transfer fees to NFT holder
    **collection_distribution.to_account_info().try_borrow_mut_lamports()? -= per_nft_amount;
    **ctx.accounts.holder.to_account_info().try_borrow_mut_lamports()? += per_nft_amount;

    // Update fee claim record
    fee_claim.nft_mint = ctx.accounts.nft_mint.key();
    fee_claim.holder = ctx.accounts.holder.key();
    fee_claim.distribution_round = collection_distribution.distribution_count;
    fee_claim.amount_claimed = per_nft_amount;
    fee_claim.claimed_at = current_timestamp;
    fee_claim.bump = ctx.bumps.fee_claim;

    // Emit event
    emit!(NftHolderPayout {
        nft_mint: ctx.accounts.nft_mint.key(),
        holder: ctx.accounts.holder.key(),
        amount: per_nft_amount,
        timestamp: current_timestamp,
    });

    msg!("NFT holder fees claimed successfully!");
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Holder: {}", ctx.accounts.holder.key());
    msg!("Amount claimed: {} lamports", per_nft_amount);
    msg!("Distribution round: {}", collection_distribution.distribution_count);

    Ok(())
}

