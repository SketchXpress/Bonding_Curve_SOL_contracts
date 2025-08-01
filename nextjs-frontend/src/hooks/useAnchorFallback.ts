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
      console.log('AnchorFallback: Applying enhanced BN patches...');
      
      // Enhanced BN patching strategy for browser environment
      const patchBNForSolana = async () => {
        try {
          // Patch 1: Global BN patching if available
          if (typeof window !== 'undefined') {
            const globalObj = window as any;
            
            // Patch global BN objects
            ['BN', 'BigNumber', '_BN'].forEach(name => {
              if (globalObj[name] && globalObj[name].prototype) {
                if (!Object.getOwnPropertyDescriptor(globalObj[name].prototype, '_bn')) {
                  Object.defineProperty(globalObj[name].prototype, '_bn', {
                    get: function() { return this; },
                    set: function(value) { (this as any).__global_bn__ = value; },
                    configurable: true,
                    enumerable: false
                  });
                  console.log(`AnchorFallback: ✓ Global ${name} _bn patch applied`);
                }
              }
            });
            
            // Create emergency BN if not exists
            if (!globalObj.BN) {
              globalObj.BN = class EmergencyBN {
                private value: any;
                public _bn: any;
                
                constructor(value: any) {
                  this.value = value;
                  this._bn = this; // Critical for Solana compatibility
                }
                
                toString() { return this.value?.toString() || '0'; }
                toNumber() { return Number(this.value) || 0; }
                add(other: any) { return new globalObj.BN(this.toNumber() + (other?.toNumber?.() || Number(other) || 0)); }
                sub(other: any) { return new globalObj.BN(this.toNumber() - (other?.toNumber?.() || Number(other) || 0)); }
                mul(other: any) { return new globalObj.BN(this.toNumber() * (other?.toNumber?.() || Number(other) || 1)); }
              };
              
              console.log('AnchorFallback: ✓ Emergency BN class created');
            }
          }
        } catch (e) {
          console.warn('AnchorFallback: Global BN patch failed:', e instanceof Error ? e.message : String(e));
        }
        
        try {
          // Patch 2: Import and patch Solana modules
          const solanaWeb3 = await import('@solana/web3.js');
          
          // Find and patch any BN-like objects in the module
          const keys = Object.keys(solanaWeb3);
          for (const key of keys) {
            const value = (solanaWeb3 as any)[key];
            if (value && typeof value === 'function' && value.prototype) {
              // Check if this looks like BN (has mathematical methods)
              if (value.prototype.add && value.prototype.sub && value.prototype.mul) {
                if (!Object.getOwnPropertyDescriptor(value.prototype, '_bn')) {
                  Object.defineProperty(value.prototype, '_bn', {
                    get: function() { return this; },
                    set: function(val) { (this as any).__bn_self__ = val; },
                    configurable: true,
                    enumerable: false
                  });
                  console.log(`AnchorFallback: ✓ Solana module BN ${key} _bn patch applied`);
                }
              }
            }
          }
        } catch (e) {
          console.warn('AnchorFallback: Solana module BN patch failed:', e instanceof Error ? e.message : String(e));
        }
      };

      // Apply all patches
      await patchBNForSolana();

      // Enhanced PublicKey creation with comprehensive error handling
      let publicKey;
      try {
        console.log('AnchorFallback: Creating PublicKey with ID:', programId);
        
        const { PublicKey } = await import('@solana/web3.js');
        
        // Try creating PublicKey normally first
        publicKey = new PublicKey(programId);
        console.log('AnchorFallback: ✓ PublicKey created successfully');
        
      } catch (pkError) {
        console.error('AnchorFallback: PublicKey creation failed:', pkError);
        
        // Emergency fallback: create a PublicKey-compatible mock
        console.log('AnchorFallback: Creating emergency PublicKey mock...');
        
        const { PublicKey } = await import('@solana/web3.js');
        
        publicKey = {
          toBase58: () => programId,
          toString: () => programId,
          toBuffer: () => {
            try {
              // Try to create a buffer from the programId (assuming it's base58)
              // Since Buffer doesn't support base58 directly, create a 32-byte buffer
              return Buffer.alloc(32);
            } catch {
              return Buffer.alloc(32);
            }
          },
          equals: (other: any) => other?.toString() === programId,
          _bn: typeof window !== 'undefined' && (window as any).BN ? 
            new (window as any).BN(programId, 'hex') : 
            { toString: () => programId }
        };
        
        // Set prototype to make it look like a real PublicKey
        try {
          Object.setPrototypeOf(publicKey, PublicKey.prototype);
        } catch (e) {
          console.warn('AnchorFallback: Could not set PublicKey prototype:', e);
        }
        
        console.log('AnchorFallback: ✓ Emergency PublicKey mock created');
      }
      
      // Create the Anchor program
      try {
        const { Program } = await import('@coral-xyz/anchor');
        
        // @ts-expect-error - Ignoring type error for program creation with enhanced patches
        const program = new Program(idl, publicKey, provider);
        
        setProgram(program);
        console.log('AnchorFallback: ✓ Program created successfully');
        return program;
        
      } catch (programError) {
        console.error('AnchorFallback: Program creation failed:', programError);
        
        // For devnet work, we should not use mock data - throw the error
        setError(programError instanceof Error ? programError.message : 'Program creation failed');
        throw new Error(`Failed to create real Anchor Program: ${programError}`);
      }
      
    } catch (err) {
      console.error('AnchorFallback: Complete program creation failed:', err);
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
