'use client';

import { useEffect } from 'react';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';

// This hook integrates the transaction hooks with the transaction history component
export const useTransactionIntegration = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();

  useEffect(() => {
    // Update the addTransaction function in each hook to use the global addTransaction function
    const updateHooks = () => {
      if (!program || !wallet.publicKey || typeof window === 'undefined' || !(window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction) {
        return;
      }

      // Monkey patch the transaction hooks to add transactions to history
      const originalCreateUser = program.methods.createUser;
      program.methods.createUser = function(...args: unknown[]) {
        const result = originalCreateUser.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Create User', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };

      const originalCreatePool = program.methods.createPool;
      program.methods.createPool = function(...args: unknown[]) {
        const result = originalCreatePool.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Create Pool', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };

      const originalBuyToken = program.methods.buyToken;
      program.methods.buyToken = function(...args: unknown[]) {
        const result = originalBuyToken.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Buy Token', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };

      const originalSellToken = program.methods.sellToken;
      program.methods.sellToken = function(...args: unknown[]) {
        const result = originalSellToken.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Sell Token', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };

      const originalCreateNft = program.methods.createNft;
      program.methods.createNft = function(...args: unknown[]) {
        const result = originalCreateNft.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Create NFT', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };

      const originalBuyNft = program.methods.buyNft;
      program.methods.buyNft = function(...args: unknown[]) {
        const result = originalBuyNft.apply(this, args);
        const originalRpc = result.rpc;
        result.rpc = async function() {
          try {
            const signature = await originalRpc.apply(this);
            (window as Window & typeof globalThis & { addTransaction?: (type: string, signature: string) => void }).addTransaction?.('Buy NFT', signature);
            return signature;
          } catch (error) {
            console.error('Transaction error:', error);
            throw error;
          }
        };
        return result;
      };
    };

    // Call the update function when the program and wallet are available
    if (program && wallet.publicKey) {
      updateHooks();
    }
  }, [program, wallet.publicKey]);
};

export default useTransactionIntegration;
