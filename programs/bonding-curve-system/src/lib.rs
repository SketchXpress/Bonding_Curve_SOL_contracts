#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

// Program ID
declare_id!("J9zFybyh4aqLrVaSFnggjq45gDt3JCPpUwqpQ31Q2pwW");

// === MODULES ===
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod math;
pub mod state;
pub mod utils;

// === IMPORTS ===
use instructions::*;
pub use errors::{ErrorCode, ErrorContext};

// Macros are defined in errors/context.rs
pub mod macros {
    // Keeping module for organizational purposes
}

/// SketchXpress Bonding Curve System
/// Revolutionary NFT marketplace with dynamic pricing
#[program]
pub mod bonding_curve_system {
    use super::*;

    // === POOL MANAGEMENT ===
    pub fn create_pool(ctx: Context<CreatePool>, args: CreatePoolArgs) -> Result<()> {
        instructions::create_pool::create_pool(ctx, args)
    }

    // === NFT LIFECYCLE ===
    pub fn create_collection_nft(ctx: Context<CreateCollectionNft>, args: CreateCollectionNftArgs) -> Result<()> {
                instructions::create_collection_nft::create_collection_nft(ctx, args)
    }

    pub fn mint_nft(ctx: Context<MintNft>, args: MintNftArgs) -> Result<()> {
        instructions::mint_nft::mint_nft(ctx, args)
    }

    pub fn buy_nft(ctx: Context<BuyNft>, args: BuyNftArgs) -> Result<()> {
        instructions::buy_nft::buy_nft(ctx, args)
    }

    pub fn sell_nft(ctx: Context<SellNFT>) -> Result<()> {
        instructions::sell_nft::sell_nft(ctx)
    }

    // === BIDDING SYSTEM ===
    pub fn list_for_bids(ctx: Context<ListForBids>, args: ListForBidsArgs) -> Result<()> {
        instructions::list_for_bids::list_for_bids(ctx, args)
    }

    pub fn place_bid(ctx: Context<PlaceBid>, args: PlaceBidArgs) -> Result<()> {
        instructions::place_bid::place_bid(ctx, args)
    }

    pub fn accept_bid(ctx: Context<AcceptBid>, args: AcceptBidArgs) -> Result<()> {
        instructions::accept_bid::accept_bid(ctx, args)
    }

    pub fn cancel_bid(ctx: Context<CancelBid>, args: CancelBidArgs) -> Result<()> {
        instructions::cancel_bid::cancel_bid(ctx, args)
    }

    // === COLLECTION FEES ===
    pub fn distribute_collection_fees(ctx: Context<DistributeCollectionFees>) -> Result<()> {
        instructions::distribute_collection_fees::distribute_collection_fees(ctx)
    }

    // === MIGRATION ===
    pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
        instructions::migrate_to_tensor::migrate_to_tensor(ctx)
    }
}

