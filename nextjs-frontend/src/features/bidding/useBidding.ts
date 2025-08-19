import { useCallback } from 'react';
import { useServices } from '../../hooks/core/useServices';
import { PublicKey } from '@solana/web3.js';

export function useBidding() {
  const services = useServices();

  const placeBid = useCallback(async (
    poolAddress: PublicKey,
    nftMint: PublicKey,
    amount: number
  ) => {
    if (!services) return;
    
    return services.biddingService.placeBid(
      poolAddress,
      nftMint,
      services.provider.wallet.publicKey,
      amount
    );
  }, [services]);

  const acceptBid = useCallback(async (
    poolAddress: PublicKey,
    nftMint: PublicKey,
    bidAddress: PublicKey
  ) => {
    if (!services) return;
    
    return services.biddingService.acceptBid(
      poolAddress,
      nftMint,
      bidAddress,
      services.provider.wallet.publicKey
    );
  }, [services]);

  const cancelBid = useCallback(async (
    bidAddress: PublicKey
  ) => {
    if (!services) return;
    
    return services.biddingService.cancelBid(
      bidAddress,
      services.provider.wallet.publicKey
    );
  }, [services]);

  return {
    placeBid,
    acceptBid,
    cancelBid,
  };
}
