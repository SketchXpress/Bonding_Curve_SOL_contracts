use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::MinterTracker;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintNftArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub collection_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(args: MintNftArgs)]
pub struct MintNft<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(
        init,
        payer = minter,
        mint::decimals = 0,
        mint::authority = minter,
        mint::freeze_authority = minter
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = minter,
        associated_token::mint = nft_mint,
        associated_token::authority = minter
    )]
    pub minter_token_account: Account<'info, TokenAccount>,

    pub collection_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"bonding-curve-pool", collection_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, crate::state::BondingCurvePool>,

    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    /// CHECK: Created by token metadata program
    pub metadata: UncheckedAccount<'info>,

    #[account(
        init,
        payer = minter,
        space = MinterTracker::SPACE,
        seeds = [b"minter-tracker", nft_mint.key().as_ref()],
        bump
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    #[account(
        seeds = [b"metadata", token_metadata_program.key().as_ref(), collection_mint.key().as_ref()],
        bump
    )]
    /// CHECK: Verified by collection mint constraint
    pub collection_metadata: UncheckedAccount<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,

    #[account(address = mpl_token_metadata::ID)]
    /// CHECK: Verified by address constraint
    pub token_metadata_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> MintNft<'info> {
    pub fn validate(&self) -> Result<()> {
        Ok(())
    }
}
