use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint};
use crate::state::NFTData;
use mpl_token_metadata::instructions::{
    CreateMasterEditionV3Cpi,
    CreateMasterEditionV3CpiAccounts,
    CreateMasterEditionV3InstructionArgs
};

#[derive(Accounts)]
pub struct CreateMasterEdition<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"nft-data", nft_mint.key().as_ref()],
        bump = nft_data.bump,
        constraint = nft_data.owner == creator.key(),
    )]
    pub nft_data: Account<'info, NFTData>,
    
    pub token_program: Program<'info, Token>,
    
    /// CHECK: This is the token metadata program
    pub token_metadata_program: UncheckedAccount<'info>,
    
    /// CHECK: Metadata account PDA
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,
    
    /// CHECK: Master edition account PDA
    #[account(mut)]
    pub master_edition_account: UncheckedAccount<'info>,
    
    /// CHECK: Token account that holds the minted token
    pub token_account: UncheckedAccount<'info>,
    
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

pub fn create_master_edition(ctx: Context<CreateMasterEdition>) -> Result<()> {
    // Create master edition account
    let master_edition_args = CreateMasterEditionV3InstructionArgs {
        max_supply: Some(0), // 0 means no printing allowed
    };
    
    // Create longer-lived bindings for account infos to fix lifetime issues
    let master_edition_account_info = ctx.accounts.master_edition_account.to_account_info();
    let mint_account_info = ctx.accounts.nft_mint.to_account_info();
    let creator_account_info = ctx.accounts.creator.to_account_info();
    let metadata_account_info = ctx.accounts.metadata_account.to_account_info();
    let token_program_info = ctx.accounts.token_program.to_account_info();
    let system_program_info = ctx.accounts.system_program.to_account_info();
    let rent_account_info = ctx.accounts.rent.to_account_info();
    let token_metadata_program_info = ctx.accounts.token_metadata_program.to_account_info();
    
    let master_edition_accounts = CreateMasterEditionV3CpiAccounts {
        edition: &master_edition_account_info,
        mint: &mint_account_info,
        update_authority: &creator_account_info,
        mint_authority: &creator_account_info,
        payer: &creator_account_info,
        metadata: &metadata_account_info,
        token_program: &token_program_info,
        system_program: &system_program_info,
        rent: Some(&rent_account_info),
    };
    
    // Create and invoke the CPI
    let master_edition_cpi = CreateMasterEditionV3Cpi::new(
        &token_metadata_program_info,
        master_edition_accounts,
        master_edition_args,
    );
    master_edition_cpi.invoke()?;
    
    Ok(())
}
