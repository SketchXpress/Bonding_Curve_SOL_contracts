#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintNftBumps {
    pub pool: u8,
    pub metadata: u8,
    pub minter_tracker: u8,
    pub collection_metadata: u8,
}
