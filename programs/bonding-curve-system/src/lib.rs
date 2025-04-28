use anchor_lang::prelude::*;

declare_id!("FzwC1iKmMYjbJUMGbw5xEwQi82uKzRzN5DkUW42AHdqo");

pub mod state;
pub mod instructions;
pub mod math;
pub mod errors;
pub mod constants;

// Re-export instruction contexts
use instructions::create_pool::*;
use instructions::create_user::*;
use instructions::buy_token::*;
use instructions::sell_token::*;
use instructions::create_nft::*;
use instructions::buy_nft::*;
use instructions::create_nft_data::*;
use instructions::create_master_edition::*;
use instructions::migrate_to_tensor::*;

#[program]
pub mod bonding_curve_system {
    use super::*;
    
    pub fn create_pool(
        ctx: Context<CreatePool>,
        base_price: u64,
        growth_factor: u64,
    ) -> Result<()> {
        instructions::create_pool::create_pool(ctx, base_price, growth_factor)
    }

    pub fn create_user(ctx: Context<CreateUser>, max_nfts: u8) -> Result<()> {
        instructions::create_user::create_user(ctx, max_nfts)
    }

    pub fn buy_token(ctx: Context<BuyToken>, amount: u64) -> Result<()> {
        instructions::buy_token::buy_token(ctx, amount)
    }

    pub fn sell_token(ctx: Context<SellToken>, amount: u64) -> Result<()> {
        instructions::sell_token::sell_token(ctx, amount)
    }

    pub fn create_nft(
        ctx: Context<CreateNFT>, 
        name: String,
        symbol: String,
        uri: String,
        seller_fee_basis_points: u16,
    ) -> Result<()> {
        instructions::create_nft::create_nft(
            ctx, 
            name,
            symbol,
            uri,
            seller_fee_basis_points,
        )
    }

    pub fn create_nft_data(
        ctx: Context<CreateNFTData>, 
        name: String,
        symbol: String,
        uri: String,
        seller_fee_basis_points: u16,
    ) -> Result<()> {
        instructions::create_nft_data::create_nft_data(
            ctx, 
            name,
            symbol,
            uri,
            seller_fee_basis_points,
        )
    }

    pub fn create_master_edition(ctx: Context<CreateMasterEdition>) -> Result<()> {
        instructions::create_master_edition::create_master_edition(ctx)
    }

    pub fn buy_nft(ctx: Context<BuyNft>) -> Result<()> {
        instructions::buy_nft::buy_nft(ctx)
    }
    
    pub fn migrate_to_tensor(ctx: Context<MigrateToTensor>) -> Result<()> {
        instructions::migrate_to_tensor::migrate_to_tensor(ctx)
    }
}
