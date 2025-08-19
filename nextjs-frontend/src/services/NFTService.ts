import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY 
} from '@solana/web3.js';
import BN from 'bn.js';
import { BondingCurveSystemProgram } from '../types/anchor';
import { NFTService as INFTService } from '../types/services';
import { PricingService } from './PricingService';

export class NFTService implements INFTService {
  private pricingService: PricingService;

  constructor(
    private program: BondingCurveSystemProgram,
    private connection: Connection
  ) {
    this.pricingService = new PricingService(program, connection);
  }

  async createPool(
    basePrice: number,
    growthFactor: number,
    userPublicKey: PublicKey,
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add create pool instruction
    const createPoolIx = await this.program.methods
      .createPool({
        basePrice: new BN(basePrice),
        growthFactor: new BN(growthFactor),
      })
      .accounts({
        authority: userPublicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
      
    transaction.add(createPoolIx);
    
    return transaction;
  }

  async mintNFT(
    poolAddress: PublicKey,
    userPublicKey: PublicKey,
  ): Promise<Transaction> {
    const pool = await this.program.account.pool.fetch(poolAddress);
    const price = await this.pricingService.calculateMintPrice(poolAddress);
    
    // Create mint transaction
    const transaction = new Transaction();
    
    // Add mint instruction
    const mintIx = await this.program.methods
      .mintNft({
        price: new BN(price),
      })
      .accounts({
        pool: poolAddress,
        user: userPublicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
      
    transaction.add(mintIx);
    
    return transaction;
  }

  async buyNFT(
    poolAddress: PublicKey,
    nftMint: PublicKey,
    userPublicKey: PublicKey,
    price: number
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add buy instruction
    const buyIx = await this.program.methods
      .buyNft({
        price: new BN(price),
      })
      .accounts({
        pool: poolAddress,
        nftMint,
        buyer: userPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
      
    transaction.add(buyIx);
    
    return transaction;
  }

  async sellNFT(
    poolAddress: PublicKey,
    nftMint: PublicKey,
    userPublicKey: PublicKey,
    price: number
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add sell instruction
    const sellIx = await this.program.methods
      .sellNft({
        price: new BN(price),
      })
      .accounts({
        pool: poolAddress,
        nftMint,
        seller: userPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
      
    transaction.add(sellIx);
    
    return transaction;
  }
}
