use anchor_lang::prelude::*;

declare_id!("8Y3ZrcHMSAEg6NgW5QsNHQr2ZoJ6bNR82pfGX1ApQpsv");

pub mod state;
pub mod instructions;
pub mod math;
pub mod errors;
pub mod constants;

use instructions::*;
use state::*;
use errors::*;

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

    pub fn buy_nft(ctx: Context<BuyNFT>) -> Result<()> {
        instructions::buy_nft::buy_nft(ctx)
    }
}
