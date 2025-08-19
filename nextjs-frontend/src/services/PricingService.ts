import { BN } from 'bn.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { BondingCurveSystemProgram } from '../types/anchor';

export class PricingService {
  constructor(
    private program: BondingCurveSystemProgram,
    private connection: Connection
  ) {}

  async calculateMintPrice(poolAddress: PublicKey): Promise<number> {
    const pool = await this.program.account.pool.fetch(poolAddress);
    const currentSupply = pool.currentSupply.toNumber();
    const basePrice = pool.basePrice.toNumber();
    const growthFactor = pool.growthFactor.toNumber();

    return basePrice * Math.pow(1 + growthFactor, currentSupply);
  }

  async calculateMinimumBid(poolAddress: PublicKey): Promise<number> {
    const pool = await this.program.account.pool.fetch(poolAddress);
    const currentPrice = await this.calculateMintPrice(poolAddress);
    const premium = pool.bidPremiumPercentage.toNumber();

    return currentPrice * (1 + premium / 100);
  }

  async calculateEscrowAmount(price: number): Promise<number> {
    return Math.floor(price / 2);
  }
}
