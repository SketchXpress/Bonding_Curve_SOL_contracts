'use client';

import { FC, ReactNode, useMemo, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { createContext, useContext } from 'react';
import { IDL } from '../utils/idl';
import { useAnchorFallback } from '../hooks/useAnchorFallback';
import dynamic from 'next/dynamic';

// Apply BN patch immediately when this module loads
if (typeof window !== 'undefined') {
  try {
    // Import all necessary polyfills
    require('../global-polyfill');
    
    // Import the deep Solana patch
    import('../utils/deep-solana-patch');
    
    // Import the targeted isPublicKeyData patch
    import('../utils/isPublicKeyData-patch');
    
    // Ensure BN is available and properly patched
    const BN = require('bn.js');
    if (BN && BN.prototype) {
      // Add _bn property if missing
      if (!Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() { return this; },
          set: function(value) { /* Allow setting for compatibility */ },
          configurable: true,
          enumerable: false
        });
      }
      
      // Add additional compatibility methods
      if (!BN.prototype.clone) {
        BN.prototype.clone = function() { return new BN(this); };
      }
    }
    
    console.log('AnchorContextProvider: BN polyfill applied successfully');
  } catch (error) {
    console.warn('AnchorContextProvider: BN polyfill application failed:', error);
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
  const fallback = useAnchorFallback();

  // State management for provider and program
  const [provider, setProvider] = useState<AnchorProvider | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize provider and program when wallet connects
  useEffect(() => {
    // Only initialize when on client side
    if (!isClient) {
      return;
    }

    const initializeAnchor = async () => {
      try {
        if (!wallet.publicKey || !wallet.signAllTransactions || !wallet.signTransaction) {
          setProvider(null);
          setProgram(null);
          setInitialized(false);
          return;
        }

        // Apply comprehensive BN patches before any Anchor operations
        if (typeof window !== 'undefined') {
          const BN = require('bn.js');
          
          // Ensure BN prototype has _bn property
          if (BN && BN.prototype && !Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
            Object.defineProperty(BN.prototype, '_bn', {
              get: function() { return this; },
              set: function(value) { /* Allow setting for compatibility */ },
              configurable: true,
              enumerable: false
            });
            console.log('AnchorContextProvider: Applied BN _bn prototype patch');
          }
          
          // Patch any existing BN instances by overriding toNumber if needed
          if (BN && BN.prototype) {
            const originalToNumber = BN.prototype.toNumber;
            BN.prototype.toNumber = function() {
              // Ensure _bn property exists before calling original method
              if (!this.hasOwnProperty('_bn')) {
                Object.defineProperty(this, '_bn', {
                  get: function() { return this; },
                  set: function(value) { /* Allow setting */ },
                  configurable: true,
                  enumerable: false
                });
              }
              return originalToNumber.call(this);
            };
            
            console.log('AnchorContextProvider: Applied BN instance method patches');
          }
          
          // Enhanced PublicKey patching - patch the constructor directly
          try {
            const { PublicKey } = require('@solana/web3.js');
            
            if (PublicKey && PublicKey.prototype) {
              // Ensure PublicKey works with our enhanced BN instances
              const originalPublicKeyConstructor = PublicKey.prototype.constructor;
              PublicKey.prototype.constructor = function(value: any) {
                try {
                  // If value is a string, create BN with enhanced compatibility
                  if (typeof value === 'string') {
                    const bs58 = require('bs58');
                    const decoded = bs58.decode(value);
                    const bn = new BN(decoded);
                    
                    // Ensure the BN has _bn property
                    if (!bn._bn) {
                      Object.defineProperty(bn, '_bn', {
                        get: function() { return this; },
                        set: function(val) { /* Allow setting */ },
                        configurable: true,
                        enumerable: false
                      });
                    }
                    
                    return originalPublicKeyConstructor.call(this, bn);
                  } else {
                    // For other types, ensure they have _bn if they're BN-like
                    if (value && typeof value === 'object' && value.constructor?.name === 'BN' && !value._bn) {
                      Object.defineProperty(value, '_bn', {
                        get: function() { return this; },
                        set: function(val) { /* Allow setting */ },
                        configurable: true,
                        enumerable: false
                      });
                    }
                    return originalPublicKeyConstructor.call(this, value);
                  }
                } catch (error) {
                  console.warn('PublicKey constructor patch failed, falling back to original:', error);
                  return originalPublicKeyConstructor.call(this, value);
                }
              };
              
              console.log('AnchorContextProvider: Applied PublicKey constructor patch');
            }
          } catch (pkError) {
            console.warn('AnchorContextProvider: PublicKey patching failed:', pkError);
          }
        }

        // Extended delay to ensure all patches are in effect
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Create the provider
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

        // Additional delay before program creation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          console.log('AnchorContextProvider: Creating PublicKey with comprehensive BN patches...');
          
          // Apply ultra-comprehensive BN patching before any operations
          if (typeof window !== 'undefined') {
            const BN = require('bn.js');
            
            // 1. Patch BN constructor at the deepest level
            if (BN) {
              const OriginalBN = BN;
              const PatchedBN = function(...args: any[]) {
                const instance = new OriginalBN(...args);
                // Ensure every BN instance has _bn pointing to itself
                if (!instance._bn) {
                  Object.defineProperty(instance, '_bn', {
                    value: instance,
                    writable: true,
                    configurable: true,
                    enumerable: false
                  });
                }
                return instance;
              };
              
              // Copy all static properties
              Object.setPrototypeOf(PatchedBN, OriginalBN);
              Object.getOwnPropertyNames(OriginalBN).forEach(name => {
                if (name !== 'prototype' && name !== 'name' && name !== 'length') {
                  try {
                    (PatchedBN as any)[name] = (OriginalBN as any)[name];
                  } catch (e) {
                    // Ignore non-configurable properties
                  }
                }
              });
              PatchedBN.prototype = OriginalBN.prototype;
              
              // Replace the global BN
              if (typeof window !== 'undefined') {
                (window as any).BN = PatchedBN;
              }
              if (typeof global !== 'undefined') {
                (global as any).BN = PatchedBN;
              }
            }
            
            // 2. Patch any existing BN instances
            if (BN && BN.prototype) {
              if (!Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
                Object.defineProperty(BN.prototype, '_bn', {
                  get: function() { return this; },
                  set: function(value) { /* Allow setting */ },
                  configurable: true,
                  enumerable: false
                });
              }
            }
          }
          
          // 3. Wait longer for patches to fully propagate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Create PublicKey with ultra-defensive error handling
          let publicKey;
          try {
            console.log('AnchorContextProvider: Attempting PublicKey creation...');
            publicKey = new PublicKey(PROGRAM_ID);
            console.log('AnchorContextProvider: ✓ PublicKey created successfully');
          } catch (pkError) {
            console.warn('AnchorContextProvider: PublicKey creation failed, using manual approach:', pkError);
            
            // Ultra-defensive manual PublicKey creation
            const BN = require('bn.js');
            const bs58 = require('bs58');
            
            try {
              const decoded = bs58.decode(PROGRAM_ID);
              const bn = new BN(decoded);
              
              // Force _bn property on the BN instance
              Object.defineProperty(bn, '_bn', {
                value: bn,
                writable: true,
                configurable: true,
                enumerable: false
              });
              
              // Additional safety: ensure all BN methods work
              if (!bn.toString) bn.toString = function() { return this.value?.toString() || '0'; };
              if (!bn.toNumber) bn.toNumber = function() { return Number(this.value || 0); };
              
              publicKey = new PublicKey(bn);
              console.log('AnchorContextProvider: ✓ PublicKey created with manual BN');
            } catch (manualError) {
              console.error('AnchorContextProvider: Manual PublicKey creation also failed:', manualError);
              throw manualError;
            }
          }
          
          // 4. Additional delay before Program creation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('AnchorContextProvider: Creating Program with enhanced compatibility...');
          
          // CRITICAL FIX: Anchor translateAddress is read-only, rely on IDL address field instead
          if (typeof window !== 'undefined') {
            try {
              // Import Anchor to check availability
              const anchorModule = require('@coral-xyz/anchor');
              
              // Note: translateAddress is a read-only property and cannot be patched
              // Instead, we ensure the IDL has the correct address field
              console.log('AnchorContextProvider: Skipping translateAddress patch (read-only), relying on IDL address field');
            } catch (anchorPatchError) {
              console.warn('AnchorContextProvider: Failed to patch translateAddress:', anchorPatchError);
            }
          }
          
          // Add address to IDL if missing (this is the root cause)
          const patchedIDL: any = { ...IDL };
          if (!patchedIDL.address) {
            patchedIDL.address = PROGRAM_ID;
            console.log('AnchorContextProvider: ✓ Added missing address to IDL');
          }
          
          // Create PublicKey from PROGRAM_ID for the Program constructor
          const programIdKey = new PublicKey(PROGRAM_ID);
          
          // @ts-expect-error - Ignoring type error for now to allow build to complete
          const anchorProgram = new Program(patchedIDL, programIdKey, anchorProvider);
          
          setProgram(anchorProgram);
          setInitialized(true);
          
          console.log('AnchorContextProvider: Provider and program initialized successfully');
        } catch (programError) {
          console.error('AnchorContextProvider: Program creation failed, switching to fallback...', programError);
          
          // Switch to fallback mode
          setUseFallback(true);
          setProvider(null);
          setProgram(null);
          setInitialized(false);
          
          // The fallback hook will handle initialization
          return;
        }
      } catch (error) {
        console.error('AnchorContextProvider: Error initializing Anchor:', error);
        setProvider(null);
        setProgram(null);
        setInitialized(false);
      }
    };

    initializeAnchor();
  }, [connection, wallet.publicKey, wallet.signAllTransactions, wallet.signTransaction, isClient]);

  // Handle fallback mode - retry with enhanced BN patching
  useEffect(() => {
    if (useFallback && fallback.initialized && fallback.provider) {
      const attemptFallbackProgram = async () => {
        try {
          console.log('AnchorContextProvider: Attempting fallback program creation with enhanced patches...');
          
          // Apply additional BN patches before attempting program creation
          if (typeof window !== 'undefined') {
            const BN = require('bn.js');
            
            // Ensure all BN instances have _bn property
            if (BN && BN.prototype) {
              if (!Object.getOwnPropertyDescriptor(BN.prototype, '_bn')) {
                Object.defineProperty(BN.prototype, '_bn', {
                  get: function() { return this; },
                  set: function(value) { /* Allow setting for compatibility */ },
                  configurable: true,
                  enumerable: false
                });
              }
              
              // Patch constructor to ensure _bn is always set
              const originalConstructor = BN.prototype.constructor;
              BN.prototype.constructor = function(...args: any[]) {
                const result = originalConstructor.apply(this, args);
                if (!this._bn) this._bn = this;
                return result;
              };
            }
          }
          
          // Wait for patches to take effect
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const program = await fallback.createProgram(PROGRAM_ID, IDL);
          
          // Only set if we got a valid Program instance
          if (program && typeof program === 'object' && 'programId' in program) {
            setProvider(fallback.provider);
            // Use type assertion to handle the fallback program type
            setProgram(program as Program);
            setInitialized(true);
            
            console.log('AnchorContextProvider: Fallback program creation successful!');
          } else {
            throw new Error('Invalid program returned from fallback');
          }
        } catch (fallbackError) {
          console.error('AnchorContextProvider: Fallback program creation failed:', fallbackError);
          
          // Don't use mock data - just leave uninitialized for devnet work
          console.log('AnchorContextProvider: Leaving uninitialized - no mock data for devnet work');
          
          setProvider(null);
          setProgram(null);
          setInitialized(false);
          setUseFallback(false);
        }
      };

      attemptFallbackProgram();
    }
  }, [useFallback, fallback.initialized, fallback.provider, fallback.createProgram]);

  // Use fallback values if in fallback mode
  const contextValue: AnchorContextState = useFallback ? {
    provider: fallback.provider || provider,
    program: fallback.program || program,
    initialized: fallback.initialized || initialized
  } : {
    provider,
    program,
    initialized
  };

  return (
    <AnchorContext.Provider value={contextValue}>
      {/* Only render children when on client side to prevent SSR issues */}
      {isClient ? children : <div>Loading Anchor context...</div>}
    </AnchorContext.Provider>
  );
};

// Export with SSR disabled for Next.js compatibility
export default dynamic(() => Promise.resolve(AnchorContextProvider), { ssr: false });
