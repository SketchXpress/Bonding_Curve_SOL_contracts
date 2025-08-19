export * from './PricingService';
export * from './NFTService';
export * from './BiddingService';

// Initialize and export service instances
import { Connection } from '@solana/web3.js';
import { BondingCurveSystemProgram } from '../types/anchor';
import { Services } from '../types/services';
import { PricingService } from './PricingService';
import { NFTService } from './NFTService';
import { BiddingService } from './BiddingService';

export function initializeServices(program: BondingCurveSystemProgram, connection: Connection): Services {
  return {
    program,
    provider: program.provider,
    pricingService: new PricingService(program, connection),
    nftService: new NFTService(program, connection),
    biddingService: new BiddingService(program, connection),
  };
}
