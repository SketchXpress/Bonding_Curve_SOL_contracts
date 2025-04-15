use anchor_lang::prelude::*;
use crate::state::UserAccount;

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        init,
        payer = owner,
        seeds = [b"user-account", owner.key().as_ref()],
        bump,
        space = UserAccount::space(max_nfts as usize),
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_user(ctx: Context<CreateUser>, max_nfts: u8) -> Result<()> {
    let user = &mut ctx.accounts.user_account;
    let bump = ctx.bumps["user_account"];
    
    user.owner = ctx.accounts.owner.key();
    user.real_sol_balance = 0;
    user.synthetic_sol_balance = 0;
    user.owned_nfts = Vec::new();
    user.bump = bump;
    
    Ok(())
}
