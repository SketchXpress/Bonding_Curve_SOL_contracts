import { Program } from '@project-serum/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';

export interface Services {
  pricingService: PricingService;
  nftService: NFTService;
  biddingService: BiddingService;
  program: Program;
  provider: any; // TODO: Replace with correct Anchor provider type
}

export interface PricingService {
  calculateMintPrice(poolAddress: PublicKey): Promise<number>;
  calculateMinimumBid(poolAddress: PublicKey): Promise<number>;
  calculateEscrowAmount(price: number): Promise<number>;
}

export interface NFTService {
  createPool(basePrice: number, growthFactor: number, userPublicKey: PublicKey): Promise<Transaction>;
  mintNFT(poolAddress: PublicKey, userPublicKey: PublicKey): Promise<Transaction>;
  buyNFT(poolAddress: PublicKey, nftMint: PublicKey, userPublicKey: PublicKey, price: number): Promise<Transaction>;
  sellNFT(poolAddress: PublicKey, nftMint: PublicKey, userPublicKey: PublicKey, price: number): Promise<Transaction>;
}

export interface BiddingService {
  placeBid(poolAddress: PublicKey, nftMint: PublicKey, bidderPublicKey: PublicKey, amount: number): Promise<Transaction>;
  acceptBid(poolAddress: PublicKey, nftMint: PublicKey, bidAddress: PublicKey, ownerPublicKey: PublicKey): Promise<Transaction>;
  cancelBid(bidAddress: PublicKey, bidderPublicKey: PublicKey): Promise<Transaction>;
}

export interface Pool {
  key(): PublicKey;
  basePrice: BN;
  growthFactor: BN;
  currentSupply: BN;
  totalMinted: BN;
  totalBurned: BN;
  holders: PublicKey[];
  holderCount: BN;
  totalVolume: BN;
  lastSalePrice: BN;
  accumulatedPlatformFees: BN;
  accumulatedCreatorFees: BN;
  accumulatedHolderFees: BN;
}
