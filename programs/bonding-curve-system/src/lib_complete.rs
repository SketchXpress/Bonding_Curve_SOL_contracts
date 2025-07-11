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
use instructions::sell_nft::*;
// Complete bidding system imports
use instructions::list_for_bids::*;
use instructions::place_bid::*;
use instructions::cancel_bid::*;
use instructions::accept_bid::*;
use instructions::distribute_collection_fees::*;

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

    // COMPLETE BIDDING SYSTEM INSTRUCTIONS

    // Lists an NFT for bidding
    pub fn list_for_bids(
        ctx: Context<ListForBids>,
        min_bid: u64,
        duration_hours: Option<u32>,
    ) -> Result<()> {
        instructions::list_for_bids::list_for_bids(ctx, min_bid, duration_hours)
    }

    // Places a bid on a listed NFT
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        args: instructions::place_bid::PlaceBidArgs,
    ) -> Result<()> {
        instructions::place_bid::place_bid(ctx, args)
    }

    // Cancels an active bid
    pub fn cancel_bid(
        ctx: Context<CancelBid>,
        bid_id: u64,
    ) -> Result<()> {
        instructions::cancel_bid::cancel_bid(ctx, bid_id)
    }

    // Accepts a bid and executes revenue distribution (95%/4%/1%)
    pub fn accept_bid(
        ctx: Context<AcceptBid>,
        bid_id: u64,
    ) -> Result<()> {
        instructions::accept_bid::accept_bid(ctx, bid_id)
    }

    // Distributes accumulated collection fees to NFT holders
    pub fn distribute_collection_fees(
        ctx: Context<DistributeCollectionFees>,
    ) -> Result<()> {
        instructions::distribute_collection_fees::distribute_collection_fees(ctx)
    }

    // Allows NFT holders to claim their share of collection fees
    pub fn claim_nft_holder_fees(
        ctx: Context<ClaimNftHolderFees>,
    ) -> Result<()> {
        instructions::distribute_collection_fees::claim_nft_holder_fees(ctx)
    }
}

