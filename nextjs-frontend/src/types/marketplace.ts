import { PublicKey } from '@solana/web3.js';

export interface Listing {
  pubkey: PublicKey;
  nftMint: PublicKey;
  price: number;
  seller: PublicKey;
}

export interface BidListing {
  publicKey: PublicKey;
  account: {
    nftMint: PublicKey;
    lister: PublicKey;
    minBid: number;
    highestBid: number;
    highestBidder: PublicKey | null;
    totalBids: number;
    status: any;
    createdAt: number;
    expiresAt: number;
    lastPriceUpdate: number;
    bondingCurvePriceAtListing: number;
    currentBondingCurvePrice: number;
    requiredPremiumBp: number;
    bump: number;
  };
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
