'use client';

import { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { createContext, useContext } from 'react';
import { PROGRAM_ID, IDL } from '../utils/idl';
import { useAnchorFallback } from '../hooks/useAnchorFallback';
import dynamic from 'next/dynamic';

// Context types
interface AnchorContextType {
  provider: AnchorProvider | null;
  program: any | null;
  initialized: boolean;
  error: string | null;
}

const AnchorContext = createContext<AnchorContextType>({
  provider: null,
  program: null,
  initialized: false,
  error: null
});

export const useAnchorContext = () => {
  return useContext(AnchorContext);
};

interface AnchorContextProviderProps {
  children: ReactNode;
}

const AnchorContextProvider: FC<AnchorContextProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memoizedProvider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }

    return new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  useEffect(() => {
    const initializeProgram = async () => {
      if (!memoizedProvider) {
        setProvider(null);
        setProgram(null);
        setInitialized(false);
        return;
      }

      try {
        setError(null);
        console.log('AnchorContextProvider: Initializing with provider...');
        
        setProvider(memoizedProvider);
        
        // Create program with proper constructor signature for Anchor 0.29.0
        const anchorProgram = new Program(IDL as any, PROGRAM_ID, memoizedProvider);
        
        setProgram(anchorProgram);
        setInitialized(true);
        
        console.log('AnchorContextProvider: Provider and program initialized successfully');
      } catch (programError) {
        console.error('AnchorContextProvider: Failed to initialize program:', programError);
        setError(programError instanceof Error ? programError.message : 'Failed to initialize program');
        setInitialized(false);
      }
    };

    initializeProgram();
  }, [memoizedProvider]);

  const contextValue = useMemo(() => ({
    provider,
    program,
    initialized,
    error
  }), [provider, program, initialized, error]);

  return (
    <AnchorContext.Provider value={contextValue}>
      {children}
    </AnchorContext.Provider>
  );
};

// Export with SSR disabled for Next.js compatibility
export default dynamic(() => Promise.resolve(AnchorContextProvider), { ssr: false });
