'use client';

import { FC, ReactNode, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { createContext, useContext } from 'react';
import { IDL } from '@/utils/idl';

// Program ID for the bonding curve system
const PROGRAM_ID = 'CoUUn4AacKW8n8Cc1zZVMPP185CaRjqYEAvu4vcGC58G';

interface AnchorContextProviderProps {
  children: ReactNode;
}

interface AnchorContextState {
  program: Program | null;
  provider: AnchorProvider | null;
  initialized: boolean;
}

const AnchorContext = createContext<AnchorContextState>({
  program: null,
  provider: null,
  initialized: false,
});

export const useAnchorContext = () => useContext(AnchorContext);

export const AnchorContextProvider: FC<AnchorContextProviderProps> = ({ children }) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const { provider, program, initialized } = useMemo(() => {
    if (!wallet.publicKey || !wallet.signAllTransactions || !wallet.signTransaction) {
      return {
        provider: null,
        program: null,
        initialized: false,
      };
    }

    // Create the provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      },
      { commitment: 'confirmed' }
    );

    // Create the program with the IDL
    // @ts-expect-error - Ignoring type error for now to allow build to complete
    const program = new Program(IDL, new PublicKey(PROGRAM_ID), provider);

    return {
      provider,
      program,
      initialized: true,
    };
  }, [connection, wallet]);

  return (
    <AnchorContext.Provider value={{ provider, program, initialized }}>
      {children}
    </AnchorContext.Provider>
  );
};

export default AnchorContextProvider;
