'use client';

import { useState, useCallback } from 'react';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';

export interface MigrateToTensorParams {
  collectionMint: PublicKey;
}

export const useMigrateToTensor = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx) => {
          const signed = await sendTransaction(tx, connection);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey, sendTransaction]);

  const migrateToTensor = useCallback(async (params: MigrateToTensorParams): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Derive pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const tx = await program.methods
        .migrateToTensor()
        .accounts({
          authority: publicKey,
          collectionMint: params.collectionMint,
          pool: poolPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Collection migrated to Tensor with signature:', signature);
      return signature;
    } catch (err) {
      console.error('Error migrating to Tensor:', err);
      setError(err instanceof Error ? err.message : 'Failed to migrate to Tensor');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const canMigrateToTensor = useCallback(async (collectionMint: PublicKey): Promise<boolean> => {
    if (!publicKey) return false;

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const poolAccount = await (program.account as any).bondingCurvePool.fetch(poolPda);
      
      // Check if the market cap has reached the threshold with proper error handling
      const thresholdMarketCap = 690_000_000; // $69k in lamports (690 SOL * 1e6 from constants)
      
      if (!poolAccount?.stats?.marketCap) {
        console.warn('Pool stats or marketCap not found');
        return false;
      }
      
      return poolAccount.stats.marketCap.toNumber() >= thresholdMarketCap;
    } catch (err) {
      console.error('Error checking migration eligibility:', err);
      return false;
    }
  }, [publicKey, getProvider]);

  const getMigrationProgress = useCallback(async (collectionMint: PublicKey): Promise<{
    currentMarketCap: number;
    thresholdMarketCap: number;
    progressPercentage: number;
  } | null> => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const poolAccount = await (program.account as any).bondingCurvePool.fetch(poolPda);
      
      // Add proper error handling for stats.marketCap
      if (!poolAccount?.stats?.marketCap) {
        console.warn('Pool stats or marketCap not found');
        return null;
      }
      
      const currentMarketCap = poolAccount.stats.marketCap.toNumber() / 1e9; // Convert to SOL
      const thresholdMarketCap = 690; // 690 SOL from constants
      const progressPercentage = Math.min((currentMarketCap / thresholdMarketCap) * 100, 100);

      return {
        currentMarketCap,
        thresholdMarketCap,
        progressPercentage,
      };
    } catch (err) {
      console.error('Error getting migration progress:', err);
      return null;
    }
  }, [getProvider]);

  return {
    migrateToTensor,
    canMigrateToTensor,
    getMigrationProgress,
    isLoading,
    error,
  };
};
