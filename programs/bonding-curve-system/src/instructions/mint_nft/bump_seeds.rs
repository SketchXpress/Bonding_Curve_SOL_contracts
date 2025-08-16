use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintNftBumps {
    pub pool: u8,
    pub metadata: u8,
    pub minter_tracker: u8,
    pub collection_metadata: u8,
}

impl anchor_lang::Bumps for MintNftBumps {
    fn get(&self, _key: &str) -> u8 {
        match _key {
            "pool" => self.pool,
            "metadata" => self.metadata,
            "minter_tracker" => self.minter_tracker,
            "collection_metadata" => self.collection_metadata,
            _ => panic!("Unknown bump key"),
        }
    }

    fn set(&mut self, _key: &str, _bump: u8) {
        match _key {
            "pool" => self.pool = _bump,
            "metadata" => self.metadata = _bump,
            "minter_tracker" => self.minter_tracker = _bump,
            "collection_metadata" => self.collection_metadata = _bump,
            _ => panic!("Unknown bump key"),
        }
    }
}
