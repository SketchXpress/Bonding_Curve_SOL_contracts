use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{NFTData, UserAccount, BondingCurvePool};
use crate::math::bonding_curve::BondingCurve;
use crate::constants::*;

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
    
    #[account(
        mut,
        seeds = [b"bonding-pool", nft_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, BondingCurvePool>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> {
    // Store necessary values before mutating accounts
    let is_primary_sale = !ctx.accounts.nft_data.primary_sale_happened;
    let last_price = ctx.accounts.nft_data.last_price;
    let nft_key = ctx.accounts.nft_mint.key();
    let buyer_key = ctx.accounts.buyer.key();
    let seller_key = ctx.accounts.nft_data.owner;
    let base_price = ctx.accounts.pool.base_price;
    let growth_factor = ctx.accounts.pool.growth_factor;
    
    // Set price based on whether it's a primary sale or secondary sale
    let price = if is_primary_sale {
        // Primary sale - fixed price
        1_000_000_000 // 1 SOL in lamports
    } else {
        // Secondary sale - 10% increase from last price
        last_price
            .checked_mul(110)
            .ok_or::<anchor_lang::error::Error>(crate::errors::ErrorCode::MathOverflow.into())?
            .checked_div(100)
            .ok_or::<anchor_lang::error::Error>(crate::errors::ErrorCode::MathOverflow.into())?
    };
    
    // Create bonding curve instance for fee calculations
    let bonding_curve = BondingCurve {
        base_price,
        growth_factor,
    };
    
    // Calculate fees based on whether it's primary or secondary sale
    let (creator_fee, burn_amount, distribute_amount) = if is_primary_sale {
        // Primary sale - 1% platform fee
        let mint_fee = bonding_curve.calculate_mint_fee(price)?;
        (mint_fee, 0, 0)
    } else {
        // Secondary sale - 5% creator royalty, 3% burn/distribute (1.5% burn + 1.5% distribute)
        let creator_fee = bonding_curve.calculate_creator_royalty(price)?;
        let burn_amount = bonding_curve.calculate_secondary_burn(price)?;
        let distribute_amount = bonding_curve.calculate_secondary_distribute(price)?;
        (creator_fee, burn_amount, distribute_amount)
    };
    
    // Calculate net amount to seller after fees
    let net_to_seller = price
        .checked_sub(creator_fee)
        .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
        .checked_sub(burn_amount)
        .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?
        .checked_sub(distribute_amount)
        .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
    
    // Find the position of the NFT in the seller's owned NFTs list
    // We need to do this before we mutate any accounts
    let seller_owned_nfts = &ctx.accounts.seller_account.owned_nfts;
    let nft_position = seller_owned_nfts.iter().position(|&x| x == nft_key);
    
    // Transfer net amount to seller
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.seller_account.to_account_info(),
        },
    );
    
    anchor_lang::system_program::transfer(cpi_context, net_to_seller)?;
    
    // If secondary sale, handle creator fee, burn, and distribute
    if !is_primary_sale {
        // Transfer creator fee to the original creator (platform)
        let cpi_context_creator = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.pool.to_account_info(),
            },
        );
        
        anchor_lang::system_program::transfer(cpi_context_creator, creator_fee)?;
        
        // For burn and distribute, we just track the amounts in the pool
        // In a real implementation, you would implement the actual distribution logic here
    }
    
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
    
    // Now get mutable references to update state
    let nft_data = &mut ctx.accounts.nft_data;
    let buyer_account = &mut ctx.accounts.buyer_account;
    let seller_account = &mut ctx.accounts.seller_account;
    let pool = &mut ctx.accounts.pool;
    
    // Update NFT data
    nft_data.owner = buyer_key;
    nft_data.primary_sale_happened = true;
    nft_data.last_price = price;
    
    // Update buyer's owned NFTs
    buyer_account.owned_nfts.push(nft_key);
    
    // Remove NFT from seller's owned NFTs
    if let Some(index) = nft_position {
        seller_account.owned_nfts.remove(index);
    }
    
    // Update pool's burn and distribute tracking for secondary sales
    if !is_primary_sale {
        pool.total_burned = pool.total_burned.checked_add(burn_amount).unwrap();
        pool.total_distributed = pool.total_distributed.checked_add(distribute_amount).unwrap();
        
        // Log the burn and distribute amounts
        msg!("Secondary sale: Burned: {} SOL, Distributed to holders: {} SOL", 
             burn_amount, distribute_amount);
    }
    
    Ok(())
}
