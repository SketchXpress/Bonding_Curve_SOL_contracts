use anchor_lang::prelude::*;

declare_id!("BYBbjAurgYTyexC2RrbTZKMDDdG7JHha1p3RsZpZCqba"); // Replace with your program ID

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;

// Re-export instruction contexts
use instructions::create_collection_nft::*;
use instructions::create_pool::*;
use instructions::migrate_to_tensor::*;
use instructions::mint_nft::*;
use instructions::sell_nft::*; // <-- Added import for the new instruction

#[program]
pub mod bonding_curve_system {
    use super::*;

    // Creates a new Metaplex Collection NFT
    pub fn create_collection_nft(
        ctx: Context<CreateCollectionNft>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::create_collection_nft::create_collection_nft(ctx, name, symbol, uri)
    }

    // Initializes a new bonding curve pool for a specific NFT collection
    pub fn create_pool(
        ctx: Context<CreatePool>,
        base_price: u64,    // Initial price in lamports
        growth_factor: u64, // Fixed-point growth factor (e.g., 1.2 = 120000)
    ) -> Result<()> {
        instructions::create_pool::create_pool(ctx, base_price, growth_factor)
    }

    // Mints a new NFT from the collection, locking SOL into its escrow
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        name: String,
        symbol: String,
        uri: String,
        seller_fee_basis_points: u16,
    ) -> Result<()> {
        instructions::mint_nft::mint_nft(ctx, name, symbol, uri, seller_fee_basis_points)
    }

    // Sells (burns) an NFT, returning SOL from its escrow
    pub fn sell_nft(ctx: Context<SellNFT>) -> Result<()> {
        instructions::sell_nft::sell_nft(ctx)
    }

    // Migrates the pool to Tensor (freezes the pool)
    pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
        instructions::migrate_to_tensor::migrate_to_tensor(ctx)
    }
}
