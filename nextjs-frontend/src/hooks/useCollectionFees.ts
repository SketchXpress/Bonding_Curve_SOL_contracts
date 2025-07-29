'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa');

export interface DistributeFeesParams {
  collectionMint: PublicKey;
}

export const useCollectionFees = () => {
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

  const distributeCollectionFees = useCallback(async (params: DistributeFeesParams): Promise<string | null> => {
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
          Buffer.from('bonding-curve-pool'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Derive collection distribution PDA
      const [collectionDistributionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('collection_distribution'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const tx = await program.methods
        .distributeCollectionFees()
        .accounts({
          payer: publicKey,
          collectionMint: params.collectionMint,
          collectionDistribution: collectionDistributionPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Collection fees distributed with signature:', signature);
      return signature;
    } catch (err) {
      console.error('Error distributing collection fees:', err);
      setError(err instanceof Error ? err.message : 'Failed to distribute collection fees');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const getCollectionDistribution = useCallback(async (collectionMint: PublicKey) => {
    if (!publicKey) return null;

    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      const [collectionDistributionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('collection_distribution'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const distributionAccount = await program.account.collectionDistribution.fetch(collectionDistributionPda);
      
      return {
        address: collectionDistributionPda,
        data: distributionAccount,
      };
    } catch (err) {
      console.error('Error fetching collection distribution:', err);
      return null;
    }
  }, [publicKey, getProvider]);

  const getPendingFees = useCallback(async (collectionMint: PublicKey): Promise<number | null> => {
    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      // Get collection distribution to check accumulated fees
      const [collectionDistributionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('collection-distribution'),
          collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      try {
        const collectionDistribution = await program.account.collectionDistribution.fetch(collectionDistributionPda);
        
        // Return accumulated fees converted to SOL
        return collectionDistribution.accumulatedFees.toNumber() / 1e9;
      } catch (err) {
        // If collection distribution doesn't exist, return 0
        if (err instanceof Error && err.message?.includes('Account does not exist')) {
          return 0;
        }
        throw err;
      }
    } catch (err) {
      console.error('Error getting pending fees:', err);
      return null;
    }
  }, [getProvider]);

  return {
    distributeCollectionFees,
    getCollectionDistribution,
    getPendingFees,
    isLoading,
    error,
  };
};
