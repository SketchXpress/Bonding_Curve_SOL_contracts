'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';

export interface BuyNftParams {
  nftMint: PublicKey;
  maxPrice: number; // in SOL
}

export const useBuyNft = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProvider = useCallback(() => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx) => {
          const signed = await sendTransaction(tx, connection);
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey, sendTransaction]);

  const buyNft = useCallback(async (params: BuyNftParams): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          params.nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get NFT data to find the pool and current owner
      const nftDataAccount = await (program.account as any).nftData.fetch(nftDataPda);
      const poolAddress = nftDataAccount.collectionId; // Assuming collection_id references the pool
      const currentOwner = nftDataAccount.owner;

      // Check if we're trying to buy our own NFT
      if (currentOwner.equals(publicKey)) {
        throw new Error('Cannot buy your own NFT');
      }

      // Derive user accounts (these should be initialized separately)
      const [buyerAccountPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user'),
          publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      const [sellerAccountPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('user'),
          currentOwner.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get buyer's token account
      const buyerTokenAccount = await getAssociatedTokenAddress(
        params.nftMint,
        publicKey
      );

      // Get current owner's token account
      const ownerTokenAccount = await getAssociatedTokenAddress(
        params.nftMint,
        currentOwner
      );

      // Check if buyer's token account exists, create instruction if not
      let createBuyerATAInstruction = null;
      try {
        await getAccount(connection, buyerTokenAccount);
      } catch (error) {
        // Account doesn't exist, create instruction to create it
        createBuyerATAInstruction = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          buyerTokenAccount,
          publicKey, // owner
          params.nftMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
      }

      // Convert max price from SOL to lamports
      const maxPriceInLamports = params.maxPrice ? new BN(params.maxPrice * 1e9) : null;

      const tx = await program.methods
        .buyNft({
          maxPrice: maxPriceInLamports,
        })
        .accounts({
          buyer: publicKey,
          buyerAccount: buyerAccountPda,
          sellerAccount: sellerAccountPda,
          nftData: nftDataPda,
          nftMint: params.nftMint,
          sellerNftTokenAccount: ownerTokenAccount,
          buyerNftTokenAccount: buyerTokenAccount,
          pool: poolAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      // Add create ATA instruction if needed
      if (createBuyerATAInstruction) {
        tx.instructions.unshift(createBuyerATAInstruction);
      }

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('NFT purchased with signature:', signature);
      return signature;
    } catch (err) {
      console.error('Error buying NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to buy NFT');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const getCurrentPrice = useCallback(async (nftMint: PublicKey): Promise<number | null> => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const nftDataAccount = await (program.account as any).nftData.fetch(nftDataPda);
      const poolAccount = await (program.account as any).bondingCurvePool.fetch(nftDataAccount.collectionId);
      
      // Return the last price from NFT data (in lamports, convert to SOL)
      return nftDataAccount.lastPrice.toNumber() / 1e9;
    } catch (err) {
      console.error('Error getting current price:', err);
      return null;
    }
  }, [getProvider]);

  const getNftOwner = useCallback(async (nftMint: PublicKey): Promise<PublicKey | null> => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, provider);

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const nftDataAccount = await (program.account as any).nftData.fetch(nftDataPda);
      return nftDataAccount.owner;
    } catch (err) {
      console.error('Error getting NFT owner:', err);
      return null;
    }
  }, [getProvider]);

  return {
    buyNft,
    getCurrentPrice,
    getNftOwner,
    isLoading,
    error,
  };
};
