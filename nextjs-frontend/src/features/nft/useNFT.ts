import { useCallback } from 'react';
import { useServices } from '../../hooks/core/useServices';
import { PublicKey } from '@solana/web3.js';

export function useNFT() {
  const services = useServices();

  const mintNFT = useCallback(async (
    poolAddress: PublicKey,
  ) => {
    if (!services) return;
    
    return services.nftService.mintNFT(
      poolAddress,
      services.provider.wallet.publicKey,
    );
  }, [services]);

  const buyNFT = useCallback(async (
    poolAddress: PublicKey,
    nftMint: PublicKey,
    price: number
  ) => {
    if (!services) return;
    
    return services.nftService.buyNFT(
      poolAddress,
      nftMint,
      services.provider.wallet.publicKey,
      price
    );
  }, [services]);

  const sellNFT = useCallback(async (
    poolAddress: PublicKey,
    nftMint: PublicKey,
    price: number
  ) => {
    if (!services) return;
    
    return services.nftService.sellNFT(
      poolAddress,
      nftMint,
      services.provider.wallet.publicKey,
      price
    );
  }, [services]);

  return {
    mintNFT,
    buyNFT,
    sellNFT,
  };
}
