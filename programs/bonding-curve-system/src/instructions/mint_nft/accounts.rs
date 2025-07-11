use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintNftArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(Accounts)]
#[instruction(args: MintNftArgs)]
pub struct MintNft<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(mut)]
    pub bonding_curve_pool: Account<'info, BondingCurvePool>,

    #[account(
        init,
        payer = minter,
        mint::decimals = 0,
        mint::authority = minter,
        mint::freeze_authority = minter,
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = minter,
        associated_token::mint = nft_mint,
        associated_token::authority = minter,
    )]
    pub minter_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = minter,
        space = 8 + std::mem::size_of::<NftEscrow>(),
        seeds = [b"escrow", nft_mint.key().as_ref()],
        bump
    )]
    pub nft_escrow: Account<'info, NftEscrow>,

    #[account(
        init,
        payer = minter,
        space = 8 + std::mem::size_of::<MinterTracker>(),
        seeds = [b"minter", nft_mint.key().as_ref()],
        bump
    )]
    pub minter_tracker: Account<'info, MinterTracker>,

    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub token_metadata_program: Program<'info, mpl_token_metadata::ID>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

