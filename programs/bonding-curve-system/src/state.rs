use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct MinterTracker {
    pub nft_mint: Pubkey,
    pub original_minter: Pubkey,
    pub minted_at: i64,
    pub collection: Pubkey,
    pub bump: u8,
}

impl MinterTracker {
    pub const SPACE: usize = 8 + // discriminator
        32 + // nft_mint
        32 + // original_minter
        8 +  // minted_at
        32 + // collection
        1;   // bump
}

#[account]
pub struct BondingCurvePool {
    pub authority: Pubkey,
    pub collection: Pubkey,
    pub config: BondingCurveConfig,
    pub state: BondingCurveState,
    pub stats: BondingCurveStats,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BondingCurveConfig {
    pub base_price: u64,
    pub growth_factor: u64,
    pub royalty_fee_bps: u16,
    pub protocol_fee_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BondingCurveState {
    pub current_supply: u64,
    pub locked_supply: u64,
    pub available_supply: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct BondingCurveStats {
    pub total_trades: u64,
    pub total_volume: u64,
    pub total_fees: u64,
}

impl BondingCurvePool {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        32 + // collection
        32 + // config (rough estimate)
        32 + // state (rough estimate)
        32 + // stats (rough estimate)
        1;  // bump
}
