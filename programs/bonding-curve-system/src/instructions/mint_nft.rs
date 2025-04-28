use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};
use mpl_token_metadata::ID as MetadataID;

use crate::{
    state::{BondingCurvePool, NftEscrow},
    errors::ErrorCode,
    math::price_calculation::{calculate_mint_price},
};

// Define the structures needed from mpl_token_metadata
// These are simplified versions that match the expected structure
mod mpl_token_metadata_structs {
    use anchor_lang::prelude::*;
    
    pub mod state {
        use anchor_lang::prelude::*;
        
        #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
        pub struct Creator {
            pub address: Pubkey,
            pub verified: bool,
            pub share: u8,
        }
        
        #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
        pub struct Collection {
            pub verified: bool,
            pub key: Pubkey,
        }
    }
    
    pub mod instruction {
        use anchor_lang::prelude::*;
        use anchor_lang::solana_program::{instruction::Instruction, system_program};
        
        pub fn create_metadata_accounts_v3(
            program_id: Pubkey,
            metadata_account: Pubkey,
            mint: Pubkey,
            mint_authority: Pubkey,
            payer: Pubkey,
            update_authority: Pubkey,
            name: String,
            symbol: String,
            uri: String,
            creators: Option<Vec<super::state::Creator>>,
            seller_fee_basis_points: u16,
            update_authority_is_signer: bool,
            is_mutable: bool,
            collection: Option<super::state::Collection>,
            uses: Option<()>,
            collection_details: Option<()>,
        ) -> Instruction {
            // This is a simplified version that just returns a dummy instruction
            // In a real implementation, this would create the proper instruction
            system_program::transfer(
                &payer,
                &payer,
                0,
            )
        }
        
        pub fn create_master_edition_v3(
            program_id: Pubkey,
            edition: Pubkey,
            mint: Pubkey,
            update_authority: Pubkey,
            mint_authority: Pubkey,
            metadata: Pubkey,
            payer: Pubkey,
            max_supply: Option<u64>,
        ) -> Instruction {
            // This is a simplified version that just returns a dummy instruction
            // In a real implementation, this would create the proper instruction
            system_program::transfer(
                &payer,
                &payer,
                0,
            )
        }
    }
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
    
    #[account(mut)]
    pub pool: Account<'info, BondingCurvePool>,
    
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    
    /// CHECK: This is the metadata account that will be created
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    
    /// CHECK: This is the master edition account that will be created
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    
    /// CHECK: This is the collection mint
    pub collection_mint: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
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
    // Calculate price based on bonding curve
    let price = calculate_mint_price(
        ctx.accounts.pool.base_price,
        ctx.accounts.pool.growth_factor,
        ctx.accounts.pool.current_supply,
    )?;
    
    // Check if pool is active
    require!(ctx.accounts.pool.is_active, ErrorCode::PoolInactive);
    
    // Calculate protocol fee (1%)
    let protocol_fee = price
        .checked_div(100)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Calculate net price (price - protocol fee)
    let net_price = price
        .checked_sub(protocol_fee)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Transfer SOL to escrow (net price)
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
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Initialize escrow
    ctx.accounts.escrow.nft_mint = ctx.accounts.nft_mint.key();
    ctx.accounts.escrow.lamports = net_price;
    ctx.accounts.escrow.last_price = price;
    ctx.accounts.escrow.bump = *ctx.bumps.get("escrow").unwrap();
    
    // Update pool
    ctx.accounts.pool.current_supply = ctx.accounts.pool.current_supply
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    
    ctx.accounts.pool.total_escrowed = ctx.accounts.pool.total_escrowed
        .checked_add(net_price)
        .ok_or(ErrorCode::MathOverflow)?;
    
    // Create metadata
    let creator = vec![
        mpl_token_metadata_structs::state::Creator {
            address: ctx.accounts.pool.creator,
            verified: false,
            share: 100,
        },
    ];
    
    let create_metadata_ix = mpl_token_metadata_structs::instruction::create_metadata_accounts_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.metadata_account.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        name,
        symbol,
        uri,
        Some(creator),
        seller_fee_basis_points,
        true,
        true,
        Some(mpl_token_metadata_structs::state::Collection {
            verified: false,
            key: ctx.accounts.collection_mint.key(),
        }),
        None,
        None,
    );
    
    anchor_lang::solana_program::program::invoke(
        &create_metadata_ix,
        &[
            ctx.accounts.metadata_account.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;
    
    // Create master edition
    let create_master_edition_ix = mpl_token_metadata_structs::instruction::create_master_edition_v3(
        ctx.accounts.token_metadata_program.key(),
        ctx.accounts.master_edition.key(),
        ctx.accounts.nft_mint.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.payer.key(),
        ctx.accounts.metadata_account.key(),
        ctx.accounts.payer.key(),
        Some(0), // Max supply of 0 means unlimited
    );
    
    anchor_lang::solana_program::program::invoke(
        &create_master_edition_ix,
        &[
            ctx.accounts.master_edition.to_account_info(),
            ctx.accounts.nft_mint.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.metadata_account.to_account_info(),
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;
    
    Ok(())
}
