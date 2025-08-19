import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { BondingCurveSystemProgram } from '../types/anchor';

export class BiddingService {
  constructor(
    private program: BondingCurveSystemProgram,
    private connection: Connection
  ) {}

  async placeBid(
    poolAddress: PublicKey,
    nftMint: PublicKey,
    bidderPublicKey: PublicKey,
    amount: number
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add bid instruction
    const bidIx = await this.program.methods
      .placeBid({
        amount: new BN(amount),
      })
      .accounts({
        pool: poolAddress,
        nftMint,
        bidder: bidderPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
      
    transaction.add(bidIx);
    
    return transaction;
  }

  async acceptBid(
    poolAddress: PublicKey,
    nftMint: PublicKey,
    bidAddress: PublicKey,
    ownerPublicKey: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add accept bid instruction
    const acceptBidIx = await this.program.methods
      .acceptBid()
      .accounts({
        pool: poolAddress,
        nftMint,
        bid: bidAddress,
        owner: ownerPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
      
    transaction.add(acceptBidIx);
    
    return transaction;
  }

  async cancelBid(
    bidAddress: PublicKey,
    bidderPublicKey: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();
    
    // Add cancel bid instruction
    const cancelBidIx = await this.program.methods
      .cancelBid()
      .accounts({
        bid: bidAddress,
        bidder: bidderPublicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
      
    transaction.add(cancelBidIx);
    
    return transaction;
  }
}
