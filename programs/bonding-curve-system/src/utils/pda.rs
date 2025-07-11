use anchor_lang::prelude::*;

/// PDA seeds and derivation utilities
pub struct PdaSeeds;

impl PdaSeeds {
    // Bidding system seeds
    pub const BID_LISTING: &'static [u8] = b"bid-listing";
    pub const BID: &'static [u8] = b"bid";
    pub const BID_ESCROW: &'static [u8] = b"bid-escrow";
    pub const MINTER_TRACKER: &'static [u8] = b"minter-tracker";
    pub const COLLECTION_DISTRIBUTION: &'static [u8] = b"collection-distribution";
    pub const FEE_CLAIM: &'static [u8] = b"fee-claim";
    
    // Bonding curve seeds
    pub const POOL: &'static [u8] = b"pool";
    pub const NFT_ESCROW: &'static [u8] = b"nft-escrow";
    pub const COLLECTION_NFT: &'static [u8] = b"collection-nft";
}

/// Helper functions for PDA derivation
pub struct PdaHelper;

impl PdaHelper {
    /// Derives bid listing PDA
    pub fn derive_bid_listing_pda(
        nft_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::BID_LISTING, nft_mint.as_ref()],
            program_id,
        )
    }

    /// Derives bid PDA
    pub fn derive_bid_pda(
        nft_mint: &Pubkey,
        bid_id: u64,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                PdaSeeds::BID,
                nft_mint.as_ref(),
                &bid_id.to_le_bytes(),
            ],
            program_id,
        )
    }

    /// Derives bid escrow PDA
    pub fn derive_bid_escrow_pda(
        bid_pda: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::BID_ESCROW, bid_pda.as_ref()],
            program_id,
        )
    }

    /// Derives minter tracker PDA
    pub fn derive_minter_tracker_pda(
        nft_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::MINTER_TRACKER, nft_mint.as_ref()],
            program_id,
        )
    }

    /// Derives collection distribution PDA
    pub fn derive_collection_distribution_pda(
        collection_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::COLLECTION_DISTRIBUTION, collection_mint.as_ref()],
            program_id,
        )
    }

    /// Derives fee claim PDA
    pub fn derive_fee_claim_pda(
        nft_mint: &Pubkey,
        distribution_round: u32,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[
                PdaSeeds::FEE_CLAIM,
                nft_mint.as_ref(),
                &distribution_round.to_le_bytes(),
            ],
            program_id,
        )
    }

    /// Derives bonding curve pool PDA
    pub fn derive_pool_pda(
        collection_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::POOL, collection_mint.as_ref()],
            program_id,
        )
    }

    /// Derives NFT escrow PDA
    pub fn derive_nft_escrow_pda(
        nft_mint: &Pubkey,
        program_id: &Pubkey,
    ) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PdaSeeds::NFT_ESCROW, nft_mint.as_ref()],
            program_id,
        )
    }
}

/// Macro for easy PDA derivation with error handling
#[macro_export]
macro_rules! derive_pda {
    ($seeds:expr, $program_id:expr) => {{
        let (pda, bump) = Pubkey::find_program_address($seeds, $program_id);
        (pda, bump)
    }};
}

/// Macro for PDA validation
#[macro_export]
macro_rules! validate_pda {
    ($account:expr, $seeds:expr, $program_id:expr, $error:expr) => {{
        let (expected_pda, _) = Pubkey::find_program_address($seeds, $program_id);
        require_keys_eq!($account.key(), expected_pda, $error);
    }};
}

