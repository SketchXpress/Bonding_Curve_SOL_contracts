use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

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

    /// CHECK: This is the metadata account for the NFT
    #[account(
        mut,
        seeds = [
            b"metadata",
            token_metadata_program.key().as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata: UncheckedAccount<'info>,

    #[account(address = anchor_spl::token::ID)]
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    /// CHECK: This is the Metaplex Token Metadata Program
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

