'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useState } from 'react';

export const useUserAccount = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [userAccountExists, setUserAccountExists] = useState<boolean | null>(null);

  // Function to check if user account exists
  const checkUserAccount = async (): Promise<boolean> => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
      return false;
    }

    try {
      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Try to fetch the account
      try {
        await program.account.userAccount.fetch(userAccount);
        setUserAccountExists(true);
        return true;
      } catch (err) {
        // If error, account doesn't exist
        setUserAccountExists(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking user account:', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  // Function to create user account
  const createUserAccount = async (maxNfts: number = 10): Promise<string | null> => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      console.log('Creating user account:', userAccount.toString());
      
      // Create the user account
      const tx = await program.methods
        .createUser(maxNfts)
        .accounts({
          owner: wallet.publicKey,
          userAccount: userAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          commitment: 'confirmed'
        });
      
      console.log('User account created with signature:', tx);
      setTxSignature(tx);
      setUserAccountExists(true);
      return tx;
    } catch (err) {
      console.error('Error creating user account:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to ensure user account exists (checks and creates if needed)
  const ensureUserAccount = async (maxNfts: number = 10): Promise<boolean> => {
    const exists = await checkUserAccount();
    if (exists) {
      return true;
    }
    
    const tx = await createUserAccount(maxNfts);
    return tx !== null;
  };

  return { 
    checkUserAccount, 
    createUserAccount, 
    ensureUserAccount,
    loading, 
    error, 
    txSignature,
    userAccountExists
  };
};
