import { useCallback } from 'react';
import { useServices } from '../../hooks/core/useServices';
import { PublicKey } from '@solana/web3.js';

export function usePool() {
  const services = useServices();

  const createPool = useCallback(async (
    name: string,
    symbol: string,
    basePrice: number,
    growthFactor: number,
  ) => {
    if (!services) return;
    
    // Logic for creating pool using NFTService
    return services.nftService.createPool(
      basePrice,
      growthFactor,
      services.provider.wallet.publicKey
    );
  }, [services]);

  const getPoolInfo = useCallback(async (
    poolAddress: PublicKey
  ) => {
    if (!services) return null;
    
    // Get pool information
    const poolAccount = await services.program.account.pool.fetch(poolAddress);
    const currentPrice = await services.pricingService.calculateMintPrice(poolAddress);
    
    return {
      ...poolAccount,
      currentPrice,
    };
  }, [services]);

  return {
    createPool,
    getPoolInfo,
  };
}
