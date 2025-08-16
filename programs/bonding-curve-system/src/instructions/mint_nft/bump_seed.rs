use anchor_lang::prelude::*;

#[derive(Clone)]
pub struct MintNftBumps {
    pub pool: u8,
    pub metadata: u8,
    pub minter_tracker: u8,
    pub collection_metadata: u8,
}

impl anchor_lang::Bumps for MintNftBumps {
    fn mut_ptr_as_ref(&mut self) -> &[u8] {
        unimplemented!()
    }
    fn new_with_vec(vec: Vec<u8>) -> Self {
        Self {
            pool: vec[0],
            metadata: vec[1],
            minter_tracker: vec[2],
            collection_metadata: vec[3],
        }
    }
    fn vec_mut(&mut self) -> &mut Vec<u8> {
        unimplemented!()
    }
}
