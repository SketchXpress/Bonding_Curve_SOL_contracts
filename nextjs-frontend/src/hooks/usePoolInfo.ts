'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { IDL, PROGRAM_ID } from '../utils/idl';

export interface PoolInfo {
  address: PublicKey;
  collection: PublicKey;
  config: {
    creator: PublicKey;
    basePrice: number; // in SOL
    growthFactor: number;
    maxSupply: number;
    migrationThreshold: number; // in SOL
    protocolFee: number; // in basis points
  };
  stats: {
    totalEscrowed: number; // in SOL
    totalVolume: number; // in SOL
    marketCap: number; // in SOL
    totalTrades: number;
    lastTradeAt: number | null; // timestamp
  };
  state: {
    isActive: boolean;
    currentSupply: number;
    isMigrated: boolean;
    migratedAt: number | null; // timestamp
    createdAt: number; // timestamp
    isMigratedToTensor: boolean;
    tensorMigrationTimestamp: number | null; // timestamp
  };
  bump: number;
}

export const usePoolInfo = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      },
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey]);

  const getPoolInfo = useCallback(async (collectionMint: PublicKey): Promise<PoolInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const poolAccount = await (program.account as any).bondingCurvePool.fetch(poolPda);
      
      return {
        address: poolPda,
        collection: poolAccount.collection,
        config: {
          creator: poolAccount.config.creator,
          basePrice: poolAccount.config.basePrice.toNumber() / 1e9,
          growthFactor: poolAccount.config.growthFactor,
          maxSupply: poolAccount.config.maxSupply,
          migrationThreshold: poolAccount.config.migrationThreshold.toNumber() / 1e9,
          protocolFee: poolAccount.config.protocolFee,
        },
        stats: {
          totalEscrowed: poolAccount.stats.totalEscrowed.toNumber() / 1e9,
          totalVolume: poolAccount.stats.totalVolume.toNumber() / 1e9,
          marketCap: poolAccount.stats.marketCap.toNumber() / 1e9,
          totalTrades: poolAccount.stats.totalTrades,
          lastTradeAt: poolAccount.stats.lastTradeAt?.toNumber() || null,
        },
        state: {
          isActive: poolAccount.state.isActive,
          currentSupply: poolAccount.state.currentSupply,
          isMigrated: poolAccount.state.isMigrated,
          migratedAt: poolAccount.state.migratedAt?.toNumber() || null,
          createdAt: poolAccount.state.createdAt.toNumber(),
          isMigratedToTensor: poolAccount.state.isMigratedToTensor,
          tensorMigrationTimestamp: poolAccount.state.tensorMigrationTimestamp?.toNumber() || null,
        },
        bump: poolAccount.bump,
      };
    } catch (err) {
      console.error('Error fetching pool info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool info');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getProvider]);

  const getAllPools = useCallback(async (): Promise<PoolInfo[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      const pools = await (program.account as any).bondingCurvePool.all();
      
      return pools.map((pool: any) => ({
        address: pool.publicKey,
        collection: pool.account.collection,
        config: {
          creator: pool.account.config.creator,
          basePrice: pool.account.config.basePrice.toNumber() / 1e9,
          growthFactor: pool.account.config.growthFactor,
          maxSupply: pool.account.config.maxSupply,
          migrationThreshold: pool.account.config.migrationThreshold.toNumber() / 1e9,
          protocolFee: pool.account.config.protocolFee,
        },
        stats: {
          totalEscrowed: pool.account.stats.totalEscrowed.toNumber() / 1e9,
          totalVolume: pool.account.stats.totalVolume.toNumber() / 1e9,
          marketCap: pool.account.stats.marketCap.toNumber() / 1e9,
          totalTrades: pool.account.stats.totalTrades,
          lastTradeAt: pool.account.stats.lastTradeAt?.toNumber() || null,
        },
        state: {
          isActive: pool.account.state.isActive,
          currentSupply: pool.account.state.currentSupply,
          isMigrated: pool.account.state.isMigrated,
          migratedAt: pool.account.state.migratedAt?.toNumber() || null,
          createdAt: pool.account.state.createdAt.toNumber(),
          isMigratedToTensor: pool.account.state.isMigratedToTensor,
          tensorMigrationTimestamp: pool.account.state.tensorMigrationTimestamp?.toNumber() || null,
        },
        bump: pool.account.bump,
      }));
    } catch (err) {
      console.error('Error fetching all pools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getProvider]);

  const getPoolPda = useCallback((collectionMint: PublicKey): PublicKey => {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('pool'),
        collectionMint.toBuffer(),
      ],
      PROGRAM_ID
    );
    return poolPda;
  }, []);

  const calculateCurrentPrice = useCallback((
    basePrice: number,
    growthFactor: number,
    nftCount: number
  ): number => {
    // Implement the bonding curve price calculation
    // This should match the calculation in your Rust contract
    const precision = 1_000_000; // From constants
    const growthFactorPrecision = 100_000_000_000; // From constants
    
    // Basic linear bonding curve: price = basePrice + (nftCount * growthFactor)
    const priceInLamports = basePrice * 1e9 + (nftCount * growthFactor * precision);
    return priceInLamports / 1e9;
  }, []);

  const getPoolStats = useCallback(async (collectionMint: PublicKey) => {
    const poolInfo = await getPoolInfo(collectionMint);
    if (!poolInfo) return null;

    const currentPrice = calculateCurrentPrice(
      poolInfo.config.basePrice,
      poolInfo.config.growthFactor,
      poolInfo.state.currentSupply
    );

    return {
      ...poolInfo.stats,
      currentPrice,
      priceChange24h: 0, // Would need to store historical data
      volume24h: 0, // Would need to store time-based data
    };
  }, [getPoolInfo, calculateCurrentPrice]);

  return {
    getPoolInfo,
    getAllPools,
    getPoolPda,
    getPoolStats,
    calculateCurrentPrice,
    isLoading,
    error,
  };
};
