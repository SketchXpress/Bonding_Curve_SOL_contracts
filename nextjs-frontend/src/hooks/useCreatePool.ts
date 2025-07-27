'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('2aaD5Ga4GPFTATJKNyGrpdMLyBrv9ZSee5Wb3nEPGGmN');

export interface CreatePoolParams {
  collectionMint: PublicKey;
  basePrice: number; // in SOL
  growthFactor?: number; // optional, will use default if not provided
}

export const useCreatePool = () => {
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

  const createPool = useCallback(async (params: CreatePoolParams): Promise<PublicKey | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive the pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('pool'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Convert SOL to lamports for base price
      const basePriceInLamports = new BN(params.basePrice * 1e9);
      
      // Use default growth factor if not provided (from constants.rs)
      const growthFactor = params.growthFactor ? new BN(params.growthFactor) : new BN(3606);

      const tx = await program.methods
        .createPool({
          basePrice: basePriceInLamports,
          growthFactor: growthFactor,
        })
        .accounts({
          creator: publicKey,
          collectionMint: params.collectionMint,
          pool: poolPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Pool created with signature:', signature);
      console.log('Pool PDA:', poolPda.toString());

      return poolPda;
    } catch (err) {
      console.error('Error creating pool:', err);
      setError(err instanceof Error ? err.message : 'Failed to create pool');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

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

  const getPoolData = useCallback(async (collectionMint: PublicKey) => {
    if (!publicKey) return null;

    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      const poolPda = getPoolPda(collectionMint);
      const poolAccount = await program.account.bondingCurvePool.fetch(poolPda);
      
      return {
        address: poolPda,
        data: poolAccount,
      };
    } catch (err) {
      console.error('Error fetching pool data:', err);
      return null;
    }
  }, [publicKey, getProvider, getPoolPda]);

  return {
    createPool,
    getPoolPda,
    getPoolData,
    isLoading,
    error,
  };
};
