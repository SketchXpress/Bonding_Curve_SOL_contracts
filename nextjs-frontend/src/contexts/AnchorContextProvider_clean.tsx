'use client';

import { FC, ReactNode, useMemo, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { createContext, useContext } from 'react';
import { IDL } from '../utils/idl';

// Apply BN patch immediately when this module loads
if (typeof window !== 'undefined') {
  try {
    // Ensure BN is available and properly patched
    const BN = require('bn.js');
    if (BN && BN.prototype && !Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
      Object.defineProperty(BN.prototype, '_bn', {
        get: function() {
          return this;
        },
        set: function(value) {
          // Allow setting for compatibility
        },
        configurable: true,
        enumerable: false
      });
      console.log('AnchorContextProvider: Applied BN _bn patch');
    }
  } catch (error) {
    console.warn('AnchorContextProvider: BN patch failed:', error);
  }
}

// Program ID for the bonding curve system
const PROGRAM_ID = 'Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa';

interface AnchorContextProviderProps {
  children: ReactNode;
}

export interface AnchorContextState { // Export the interface
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

  // Ensure BN is properly patched on component mount
  useEffect(() => {
    try {
      const BN = require('bn.js');
      if (BN && BN.prototype && !Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() {
            return this;
          },
          set: function(value) {
            // Allow setting for compatibility
          },
          configurable: true,
          enumerable: false
        });
        console.log('AnchorContextProvider: useEffect BN _bn patch applied');
      }
    } catch (error) {
      console.warn('AnchorContextProvider: useEffect BN patch failed:', error);
    }
  }, []);

  const { provider, program, initialized } = useMemo(() => {
    try {
      if (!wallet.publicKey || !wallet.signAllTransactions || !wallet.signTransaction) {
        return {
          provider: null,
          program: null,
          initialized: false,
        };
      }

      // Create the provider with error handling
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
    } catch (error) {
      console.error('AnchorContextProvider: Error creating provider/program:', error);
      return {
        provider: null,
        program: null,
        initialized: false,
      };
    }
  }, [connection, wallet]);

  return (
    <AnchorContext.Provider value={{ provider, program, initialized }}>
      {children}
    </AnchorContext.Provider>
  );
};

export default AnchorContextProvider;
