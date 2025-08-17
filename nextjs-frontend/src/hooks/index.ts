'use client';

// Export all hooks for easy importing
export { useBidListing } from './useBidListing';
export { useBidManagement } from './useBidManagement';
export { useBidPlacement } from './useBidPlacement';
export { useBondingCurveHistory } from './useBondingCurveHistory';
export { useTransactionIntegration } from './useTransactionIntegration';
export { useUserAccount } from './useUserAccount';

// Export hooks from useNftTransactions
export { useMintNft as useMintNftOld, useSellNft as useSellNftOld } from './useNftTransactions';

// Export hooks from useTransactions  
export { useCreateCollectionNft as useCreateCollectionNftOld, useCreatePool as useCreatePoolOld, useMigrateToTensor as useMigrateToTensorOld } from './useTransactions';

// New dedicated hooks
export { useCreatePool } from './useCreatePool';
export { useCreateCollectionNft } from './useCreateCollectionNft';
export { useMintNft } from './useMintNft';
export { useBuyNft } from './useBuyNft';
export { useSellNft } from './useSellNft';
export { useCollectionFees } from './useCollectionFees';
export { useMigrateToTensor } from './useMigrateToTensor';
export { usePoolInfo } from './usePoolInfo';

// Types
export type { CreatePoolParams } from './useCreatePool';
export type { CreateCollectionNftParams } from './useCreateCollectionNft';
export type { MintNftParams } from './useMintNft';
export type { BuyNftParams } from './useBuyNft';
export type { SellNftParams } from './useSellNft';
export type { DistributeFeesParams } from './useCollectionFees';
export type { MigrateToTensorParams } from './useMigrateToTensor';
export type { PoolInfo } from './usePoolInfo';
