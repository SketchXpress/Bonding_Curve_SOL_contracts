import { PublicKey } from '@solana/web3.js';

export interface Listing {
  pubkey: PublicKey;
  nftMint: PublicKey;
  price: number;
  seller: PublicKey;
}

export interface BidData {
  bidId: number;
  nftMint: PublicKey;
  bidder: PublicKey;
  amount: number;
  status: string;
  createdAt: number;
  expiresAt: number;
}

export interface NFTMetadata {
  mint: PublicKey;
  name: string;
  image: string;
  owner: PublicKey;
  isListed?: boolean;
  listingPubkey?: PublicKey;
}
