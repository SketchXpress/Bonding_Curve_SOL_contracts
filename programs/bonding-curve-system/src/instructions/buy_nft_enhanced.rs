use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token, TokenAccount};
use crate::{
    state::{BondingCurvePool, MinterTracker, CollectionDistribution},
    constants::{MINTER_REVENUE_PERCENTAGE, PLATFORM_REVENUE_PERCENTAGE, COLLECTION_REVENUE_PERCENTAGE},
    errors::ErrorCode,
};

#[event]
pub struct NftPurchased {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub minter_share: u64,
    pub platform_share: u64,
    pub collection_share: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct BuyNft<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub buyer_account: Account<'info, crate::state::UserAccount>,
    
    #[account(mut)]
    pub seller_account: Account<'info, crate::state::UserAccount>,
    
    #[account(mut)]
    pub nft_data: Account<'info, crate::state::NFTData>,
    
    pub nft_mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(mut)]
    pub seller_nft_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer_nft_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool: Account<'info, BondingCurvePool>,

    /// Minter tracker for revenue distribution
    #[account(
        mut,
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

    /// Platform fee recipient
    /// CHECK: Platform wallet for receiving fees
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    /// Original minter wallet (receives 95% of secondary sales)
    /// CHECK: Original minter wallet
    #[account(
        mut,
        constraint = original_minter.key() == minter_tracker.original_minter @ ErrorCode::InvalidAuthority
    )]
    pub original_minter: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_nft(ctx: Context<BuyNft>, offered_price: u64) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp;

    // Verify NFT ownership
    require!(
        ctx.accounts.nft_data.owner == ctx.accounts.seller_account.key(),
        ErrorCode::InvalidAuthority
    );
    
    // Verify NFT is available for sale
    require!(
        ctx.accounts.seller_nft_token_account.amount > 0,
        ErrorCode::NFTAlreadySold
    );
    
    // Calculate price based on pool state and NFT data
    let base_price = calculate_nft_price(&ctx.accounts.nft_data, &ctx.accounts.pool)?;
    
    // For direct purchases, we can allow negotiated prices above base price
    let final_price = if offered_price >= base_price {
        offered_price
    } else {
        base_price
    };

    // Check if buyer has enough funds
    require!(
        ctx.accounts.buyer.lamports() >= final_price,
        ErrorCode::InsufficientFunds
    );

    // Calculate revenue distribution (same as bidding system)
    let minter_share = final_price
        .checked_mul(MINTER_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    let platform_share = final_price
        .checked_mul(PLATFORM_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    let collection_share = final_price
        .checked_mul(COLLECTION_REVENUE_PERCENTAGE)
        .and_then(|x| x.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    let seller_share = final_price
        .checked_sub(minter_share)
        .and_then(|x| x.checked_sub(platform_share))
        .and_then(|x| x.checked_sub(collection_share))
        .ok_or(ErrorCode::MathOverflow)?;

    // Execute revenue distribution
    
    // Transfer to original minter (95%)
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= minter_share;
    **ctx.accounts.original_minter.to_account_info().try_borrow_mut_lamports()? += minter_share;

    // Transfer to platform (4%)
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= platform_share;
    **ctx.accounts.platform_wallet.to_account_info().try_borrow_mut_lamports()? += platform_share;

    // Add to collection distribution pool (1%)
    **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= collection_share;
    ctx.accounts.collection_distribution.add_fees(collection_share);

    // Remaining amount to seller (if any)
    if seller_share > 0 {
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= seller_share;
        **ctx.accounts.seller_account.to_account_info().try_borrow_mut_lamports()? += seller_share;
    }

    // Transfer NFT from seller to buyer
    let transfer_instruction = Transfer {
        from: ctx.accounts.seller_nft_token_account.to_account_info(),
        to: ctx.accounts.buyer_nft_token_account.to_account_info(),
        authority: ctx.accounts.seller_account.to_account_info(),
    };

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        ),
        1, // Transfer 1 NFT
    )?;

    // Update NFT ownership
    ctx.accounts.nft_data.owner = ctx.accounts.buyer.key();

    // Update minter tracker
    ctx.accounts.minter_tracker.add_revenue(minter_share);

    // Update user accounts
    ctx.accounts.buyer_account.owned_nfts.push(ctx.accounts.nft_mint.key());
    if let Some(pos) = ctx.accounts.seller_account.owned_nfts.iter().position(|&x| x == ctx.accounts.nft_mint.key()) {
        ctx.accounts.seller_account.owned_nfts.remove(pos);
    }

    // Emit event
    emit!(NftPurchased {
        buyer: ctx.accounts.buyer.key(),
        seller: ctx.accounts.seller_account.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        price: final_price,
        minter_share,
        platform_share,
        collection_share,
        timestamp: current_timestamp,
    });

    msg!("NFT purchased successfully!");
    msg!("Buyer: {}", ctx.accounts.buyer.key());
    msg!("Seller: {}", ctx.accounts.seller_account.key());
    msg!("NFT Mint: {}", ctx.accounts.nft_mint.key());
    msg!("Price: {} lamports", final_price);
    msg!("Original Minter Share (95%): {} lamports", minter_share);
    msg!("Platform Share (4%): {} lamports", platform_share);
    msg!("Collection Share (1%): {} lamports", collection_share);
    msg!("Seller Share: {} lamports", seller_share);

    Ok(())
}

// Helper function to calculate NFT price
fn calculate_nft_price(
    nft_data: &crate::state::NFTData,
    pool: &BondingCurvePool,
) -> Result<u64> {
    // This is a simplified price calculation
    // In a real implementation, you'd use more sophisticated pricing
    let base_price = pool.base_price;
    let rarity_multiplier = match nft_data.rarity {
        Some(rarity) => rarity as u64,
        None => 1,
    };
    
    base_price
        .checked_mul(rarity_multiplier)
        .ok_or(ErrorCode::MathOverflow.into())
}

