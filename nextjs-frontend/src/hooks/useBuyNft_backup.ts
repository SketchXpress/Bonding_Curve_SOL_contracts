'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { PROGRAM_ID, IDL } from '../utils/idl';

export interface BuyNftParams {
  nftMint: PublicKey;
  maxPrice: number;
}

export const useBuyNft = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    const wallet = { publicKey, signTransaction: sendTransaction } as any;
    return new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey, sendTransaction]);

  const buyNft = useCallback(async (params: BuyNftParams) => {
    if (!publicKey) {
      setError('Wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          params.nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get NFT data to find pool
      const nftData = await (program.account as any).nftData.fetch(nftDataPda);
      const poolPda = nftData.pool;

      // Get pool data
      const poolData = await (program.account as any).pool.fetch(poolPda);

      // Calculate current price
      const currentPrice = poolData.currentPrice;
      if (currentPrice.gt(new BN(params.maxPrice))) {
        throw new Error(`Price too high: ${currentPrice.toString()} > ${params.maxPrice}`);
      }

      // Build transaction
      const tx = await (program.methods as any)
        .buyNft({
          maxPrice: new BN(params.maxPrice),
        })
        .accounts({
          buyer: publicKey,
          nftMint: params.nftMint,
          nftData: nftDataPda,
          pool: poolPda,
        })
        .transaction();

      // Send transaction
      const signature = await sendTransaction(tx as Transaction, connection);
      
      setTxSignature(signature);
      console.log('Buy NFT transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Buy NFT transaction confirmed:', signature);

    } catch (err) {
      console.error('Buy NFT error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, sendTransaction, getProvider]);

  const getCurrentPrice = useCallback(async (nftMint: PublicKey): Promise<number | null> => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get NFT data
      const nftData = await (program.account as any).nftData.fetch(nftDataPda);
      const poolPda = nftData.pool;

      // Get pool data
      const poolData = await (program.account as any).pool.fetch(poolPda);
      
      return poolData.currentPrice.toNumber();
    } catch (err) {
      console.error('Get current price error:', err);
      return null;
    }
  }, [getProvider]);

  const getNftOwner = useCallback(async (nftMint: PublicKey): Promise<PublicKey | null> => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get NFT data
      const nftData = await (program.account as any).nftData.fetch(nftDataPda);
      
      return nftData.owner;
    } catch (err) {
      console.error('Get NFT owner error:', err);
      return null;
    }
  }, [getProvider]);

  return {
    buyNft,
    getCurrentPrice,
    getNftOwner,
    isLoading,
    error,
    txSignature,
  };
};
