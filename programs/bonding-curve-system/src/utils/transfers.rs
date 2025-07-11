use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

/// SOL transfer utilities
pub struct SolTransfer;

impl SolTransfer {
    /// Transfer SOL from one account to another
    pub fn transfer_sol(
        from: &AccountInfo,
        to: &AccountInfo,
        amount: u64,
    ) -> Result<()> {
        // Check sufficient balance
        require!(
            from.lamports() >= amount,
            crate::errors::ErrorCode::InsufficientFunds
        );

        // Perform transfer
        **from.try_borrow_mut_lamports()? -= amount;
        **to.try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    /// Transfer SOL with system program (for non-PDA accounts)
    pub fn transfer_sol_with_system(
        from: &AccountInfo,
        to: &AccountInfo,
        amount: u64,
        system_program: &AccountInfo,
    ) -> Result<()> {
        let transfer_instruction = anchor_lang::system_program::Transfer {
            from: from.clone(),
            to: to.clone(),
        };

        anchor_lang::system_program::transfer(
            CpiContext::new(system_program.clone(), transfer_instruction),
            amount,
        )
    }

    /// Distribute revenue according to the 95%/4%/1% model
    pub fn distribute_revenue(
        payer: &AccountInfo,
        minter: &AccountInfo,
        platform: &AccountInfo,
        collection_distribution: &mut Account<crate::state::CollectionDistribution>,
        total_amount: u64,
    ) -> Result<(u64, u64, u64)> {
        let (minter_share, platform_share, collection_share) = 
            crate::state::types::RevenueDistribution::calculate_shares(total_amount)?;

        // Transfer to minter (95%)
        Self::transfer_sol(payer, minter, minter_share)?;

        // Transfer to platform (4%)
        Self::transfer_sol(payer, platform, platform_share)?;

        // Add to collection distribution pool (1%)
        collection_distribution.add_fees(collection_share);

        Ok((minter_share, platform_share, collection_share))
    }
}

/// Token transfer utilities
pub struct TokenTransfer;

impl TokenTransfer {
    /// Transfer NFT from one account to another
    pub fn transfer_nft(
        from_account: &Account<TokenAccount>,
        to_account: &Account<TokenAccount>,
        authority: &AccountInfo,
        token_program: &Program<Token>,
    ) -> Result<()> {
        // Verify NFT ownership
        require!(
            from_account.amount == 1,
            crate::errors::ErrorCode::InsufficientNftBalance
        );

        let transfer_instruction = Transfer {
            from: from_account.to_account_info(),
            to: to_account.to_account_info(),
            authority: authority.clone(),
        };

        transfer(
            CpiContext::new(
                token_program.to_account_info(),
                transfer_instruction,
            ),
            1, // Transfer 1 NFT
        )
    }

    /// Transfer NFT with PDA authority
    pub fn transfer_nft_with_pda(
        from_account: &Account<TokenAccount>,
        to_account: &Account<TokenAccount>,
        authority: &AccountInfo,
        token_program: &Program<Token>,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        // Verify NFT ownership
        require!(
            from_account.amount == 1,
            crate::errors::ErrorCode::InsufficientNftBalance
        );

        let transfer_instruction = Transfer {
            from: from_account.to_account_info(),
            to: to_account.to_account_info(),
            authority: authority.clone(),
        };

        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                transfer_instruction,
                signer_seeds,
            ),
            1, // Transfer 1 NFT
        )
    }
}

/// Escrow management utilities
pub struct EscrowManager;

impl EscrowManager {
    /// Create escrow for a bid
    pub fn create_bid_escrow(
        bidder: &AccountInfo,
        escrow: &AccountInfo,
        amount: u64,
        system_program: &AccountInfo,
    ) -> Result<()> {
        // Transfer SOL to escrow
        SolTransfer::transfer_sol_with_system(
            bidder,
            escrow,
            amount,
            system_program,
        )
    }

    /// Release escrow back to bidder (for cancelled bids)
    pub fn release_bid_escrow(
        escrow: &AccountInfo,
        bidder: &AccountInfo,
        amount: u64,
    ) -> Result<()> {
        SolTransfer::transfer_sol(escrow, bidder, amount)
    }

    /// Transfer escrow to recipients (for accepted bids)
    pub fn transfer_escrow_to_recipients(
        escrow: &AccountInfo,
        minter: &AccountInfo,
        platform: &AccountInfo,
        collection_distribution: &mut Account<crate::state::CollectionDistribution>,
        total_amount: u64,
    ) -> Result<(u64, u64, u64)> {
        SolTransfer::distribute_revenue(
            escrow,
            minter,
            platform,
            collection_distribution,
            total_amount,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_revenue_calculation() {
        let total = 1_000_000_000; // 1 SOL
        let (minter, platform, collection) = 
            crate::state::types::RevenueDistribution::calculate_shares(total).unwrap();
        
        assert_eq!(minter, 950_000_000); // 0.95 SOL
        assert_eq!(platform, 40_000_000); // 0.04 SOL
        assert_eq!(collection, 10_000_000); // 0.01 SOL
    }
}

