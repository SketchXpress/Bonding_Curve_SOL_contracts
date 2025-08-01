'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PROGRAM_ID, IDL } from '../utils/idl';

export interface TransactionHistory {
  signature: string;
  type: 'buy' | 'sell' | 'mint';
  nftMint: PublicKey;
  price: number;
  timestamp: number;
  user: PublicKey;
}

export const useBondingCurveHistory = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);

  const getProvider = useCallback(() => {
    const wallet = { publicKey } as any;
    return new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey]);

  const fetchTransactionHistory = useCallback(async (poolPubkey?: PublicKey) => {
    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      let program: any;
      let coder: any;
      
      try {
        console.log('useBondingCurveHistory: Creating program with standardized IDL...');
        console.log('useBondingCurveHistory: IDL address field:', IDL.address);
        console.log('useBondingCurveHistory: IDL instructions count:', IDL.instructions?.length);
        console.log('useBondingCurveHistory: IDL accounts count:', IDL.accounts?.length);
        
        program = new Program(IDL as any, PROGRAM_ID, provider);
        coder = program.coder.instruction;
        console.log('useBondingCurveHistory: ✓ Standardized IDL Program created successfully');
      } catch (directError) {
        console.warn('Safe program creation failed:', directError);
        
        try {
          console.log('useBondingCurveHistory: Attempting direct program creation with enhanced BN patches...');
          
          // Use the standardized IDL directly
          try {
            program = new Program(IDL as any, PROGRAM_ID, provider);
            coder = program.coder.instruction;
            console.log('useBondingCurveHistory: Program created successfully with standardized IDL');
          } catch (programError: any) {
            console.error('useBondingCurveHistory: Program creation failed:', programError?.message);
            throw programError; // Re-throw to be handled by outer catch
          }
        } catch (fallbackError: any) {
          console.error('useBondingCurveHistory: All program creation attempts failed:', fallbackError?.message);
          throw fallbackError;
        }
      }

      // Get transaction signatures
      const signatures = await connection.getSignaturesForAddress(
        poolPubkey || PROGRAM_ID,
        { limit: 100 }
      );

      const transactionDetails: TransactionHistory[] = [];

      for (const sigInfo of signatures) {
        try {
          const tx = await connection.getTransaction(sigInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (tx && tx.meta && !tx.meta.err) {
            // Parse instruction data to determine transaction type
            // This is a simplified version - you might want to add more sophisticated parsing
            const message = tx.transaction.message;
            let instructions: any[] = [];
            
            // Handle both legacy and versioned transactions
            if ('instructions' in message) {
              instructions = message.instructions;
            } else if ('compiledInstructions' in message) {
              instructions = message.compiledInstructions;
            }
            
            const instructionData = instructions[0];
            
            transactionDetails.push({
              signature: sigInfo.signature,
              type: 'buy', // Simplified - you'd determine this from instruction data
              nftMint: PROGRAM_ID, // Simplified - you'd extract this from the transaction
              price: 0, // Simplified - you'd calculate this from the transaction
              timestamp: (sigInfo.blockTime || 0) * 1000,
              user: PROGRAM_ID, // Simplified - you'd extract this from the transaction
            });
          }
        } catch (txError) {
          console.warn('Failed to parse transaction:', sigInfo.signature, txError);
        }
      }

      setTransactions(transactionDetails);
    } catch (err) {
      console.error('Fetch transaction history error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [connection, getProvider]);

  const getPoolHistory = useCallback(async (poolPubkey: PublicKey) => {
    return fetchTransactionHistory(poolPubkey);
  }, [fetchTransactionHistory]);

  const getUserHistory = useCallback(async (userPubkey: PublicKey) => {
    // This would require filtering transactions by user
    // For now, we'll just fetch all transactions
    return fetchTransactionHistory();
  }, [fetchTransactionHistory]);

  return {
    fetchTransactionHistory,
    getPoolHistory,
    getUserHistory,
    transactions,
    isLoading,
    error,
  };
};
