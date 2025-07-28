'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa');

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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const poolAccount = await program.account.bondingCurvePool.fetch(poolPda);
      
      // Check if the market cap has reached the threshold
      const thresholdMarketCap = 690_000_000; // $69k in lamports (690 SOL * 1e6 from constants)
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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const poolAccount = await program.account.bondingCurvePool.fetch(poolPda);
      
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
