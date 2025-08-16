use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct MintNftBumps {
    pub pool: u8,
    pub metadata: u8,
    pub minter_tracker: u8,
    pub collection_metadata: u8,
}

impl anchor_lang::Bumps for MintNftBumps {
    fn get(&self, key: &str) -> u8 {
        match key {
            "pool" => self.pool,
            "metadata" => self.metadata,
            "minter_tracker" => self.minter_tracker,
            "collection_metadata" => self.collection_metadata,
            _ => panic!("Invalid bump key"),
        }
    }

    fn set(&mut self, key: &str, bump: u8) {
        match key {
            "pool" => self.pool = bump,
            "metadata" => self.metadata = bump,
            "minter_tracker" => self.minter_tracker = bump,
            "collection_metadata" => self.collection_metadata = bump,
            _ => panic!("Invalid bump key"),
        }
    }
}
