import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';

// Custom hook to handle Anchor context without immediate Program creation
export const useAnchorFallback = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeProvider = async () => {
      try {
        if (!wallet.publicKey || !wallet.signAllTransactions || !wallet.signTransaction) {
          setProvider(null);
          setProgram(null);
          setInitialized(false);
          setError(null);
          return;
        }

        // Create provider only (not program yet)
        const anchorProvider = new AnchorProvider(
          connection,
          {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
          },
          { commitment: 'confirmed' }
        );

        setProvider(anchorProvider);
        setInitialized(true);
        setError(null);
        
        console.log('AnchorFallback: Provider initialized successfully');
      } catch (err) {
        console.error('AnchorFallback: Provider initialization failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setProvider(null);
        setProgram(null);
        setInitialized(false);
      }
    };

    initializeProvider();
  }, [connection, wallet.publicKey, wallet.signAllTransactions, wallet.signTransaction]);

  const createProgram = async (programId: string, idl: any) => {
    if (!provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Apply BN patches right before program creation
      const BN = require('bn.js');
      if (BN && BN.prototype && !Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() { return this; },
          set: function(value) { /* Allow setting */ },
          configurable: true,
          enumerable: false
        });
        console.log('AnchorFallback: Applied BN patch before program creation');
      }

      const { PublicKey } = await import('@solana/web3.js');
      const { Program } = await import('@coral-xyz/anchor');
      
      // @ts-expect-error - Ignoring type error for program creation
      const program = new Program(idl, new PublicKey(programId), provider);
      
      setProgram(program);
      console.log('AnchorFallback: Program created successfully');
      return program;
    } catch (err) {
      console.error('AnchorFallback: Program creation failed:', err);
      setError(err instanceof Error ? err.message : 'Program creation failed');
      throw err;
    }
  };

  return {
    provider,
    program,
    initialized,
    error,
    createProgram
  };
};
