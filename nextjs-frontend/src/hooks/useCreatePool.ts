'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';

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
      const program = new Program(IDL as any, provider);

      // Verify the program exists
      console.log('Checking if program exists at:', PROGRAM_ID.toString());
      try {
        const programInfo = await connection.getAccountInfo(PROGRAM_ID);
        if (!programInfo) {
          throw new Error('Program not found at address: ' + PROGRAM_ID.toString());
        }
        if (!programInfo.executable) {
          throw new Error('Account at program address is not executable');
        }
        console.log('Program verified, owner:', programInfo.owner.toString());
      } catch (programError) {
        console.error('Program verification failed:', programError);
        throw new Error(`Program verification failed: ${programError instanceof Error ? programError.message : 'Unknown program error'}`);
      }

      // Derive the pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      console.log('Creating pool with params:', {
        collectionMint: params.collectionMint.toString(),
        basePrice: params.basePrice,
        growthFactor: params.growthFactor,
        poolPda: poolPda.toString(),
        creator: publicKey.toString()
      });

      // Check if pool already exists
      try {
        const existingPool = await (program.account as any).bondingCurvePool.fetch(poolPda);
        if (existingPool) {
          throw new Error('Pool already exists for this collection');
        }
      } catch (fetchError) {
        // Pool doesn't exist, which is what we want
        console.log('Pool does not exist yet, proceeding with creation');
      }

      // Check wallet balance
      const balance = await connection.getBalance(publicKey);
      console.log('Wallet balance:', balance / 1e9, 'SOL');
      if (balance < 0.01 * 1e9) { // Less than 0.01 SOL
        throw new Error('Insufficient SOL balance. Need at least 0.01 SOL for transaction fees.');
      }

      // Convert SOL to lamports for base price
      const basePriceInLamports = new BN(params.basePrice * 1e9);
      
      // Use default growth factor if not provided (from constants.rs)
      const growthFactor = params.growthFactor ? new BN(params.growthFactor) : new BN(3606);

      console.log('Transaction parameters:', {
        basePriceInLamports: basePriceInLamports.toString(),
        growthFactor: growthFactor.toString()
      });

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

      console.log('Transaction created, simulating first...');
      
      // Set a recent blockhash to avoid stale blockhash issues
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      console.log('Transaction prepared with blockhash:', blockhash);
      
      // Simulate the transaction first to catch any errors
      try {
        const simulation = await connection.simulateTransaction(tx);
        console.log('Transaction simulation result:', simulation);
        
        if (simulation.value.err) {
          console.error('Transaction simulation failed:', simulation.value.err);
          throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        
        console.log('Transaction simulation successful, sending...');
      } catch (simError) {
        console.error('Error during transaction simulation:', simError);
        throw new Error(`Transaction simulation error: ${simError instanceof Error ? simError.message : 'Unknown simulation error'}`);
      }

      const signature = await sendTransaction(tx, connection);
      console.log('Transaction sent, waiting for confirmation...');
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
        Buffer.from('bonding-curve-pool'),
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
      const program = new Program(IDL as any, provider);
      
      const poolPda = getPoolPda(collectionMint);
      const poolAccount = await (program.account as any).bondingCurvePool.fetch(poolPda);
      
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
