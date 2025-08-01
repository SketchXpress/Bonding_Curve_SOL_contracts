pub mod accounts;

pub use accounts::*;

use anchor_lang::prelude::*;

/// Main mint NFT instruction - truly minimal version for debugging stack overflow
pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
    msg!("Starting truly minimal NFT mint");

    // Only do the most basic validation and token minting
    if args.name.is_empty() {
        return Err(ProgramError::InvalidInstructionData.into());
    }

    // Simple token mint without any complex operations
    let cpi_accounts = anchor_spl::token::MintTo {
        mint: ctx.accounts.nft_mint.to_account_info(),
        to: ctx.accounts.minter_token_account.to_account_info(),
        authority: ctx.accounts.minter.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::mint_to(cpi_ctx, 1)?;

    msg!("Truly minimal NFT mint completed");
    Ok(())
}

