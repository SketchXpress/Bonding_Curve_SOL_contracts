'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf');

export interface SellNftParams {
  nftMint: PublicKey;
}

export const useSellNft = () => {
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

  const sellNft = useCallback(async (params: SellNftParams): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive NFT escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft-escrow'),
          params.nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get escrow data to find the pool
      const escrowAccount = await program.account.nftEscrow.fetch(escrowPda);

      // Get pool data to find creator
      // For this, we'll need to find the pool by collection mint or get it from escrow if it has pool reference
      // Let's assume we can derive the pool from the NFT mint or we have it stored in escrow
      // For now, let's get it from the existing pool structures

      // Get seller's token account
      const sellerTokenAccount = await getAssociatedTokenAddress(
        params.nftMint,
        publicKey
      );

      // We need to find the collection mint and pool
      // This would typically be stored in NFT metadata or we'd need to derive it
      // For now, let's assume we can get it from the NFT metadata or have it as a parameter

      const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

      // Derive metadata account
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          params.nftMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Derive master edition account
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          params.nftMint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // We'll need the collection mint and pool - this should be passed as parameter or derived
      // For now, let's throw an error indicating we need more information
      throw new Error('Collection mint and pool address needed for sell operation');

      // The actual transaction would look like this once we have the required addresses:
      /*
      const tx = await program.methods
        .sellNft()
        .accounts({
          seller: publicKey,
          pool: poolAddress,
          escrow: escrowPda,
          creator: creatorAddress,
          nftMint: params.nftMint,
          sellerNftTokenAccount: sellerTokenAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
          collectionMint: collectionMint,
          collectionMetadata: collectionMetadata,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('NFT sold with signature:', signature);
      return signature;
      */
    } catch (err) {
      console.error('Error selling NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to sell NFT');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const canSellNft = useCallback(async (nftMint: PublicKey): Promise<boolean> => {
    if (!publicKey) return false;

    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const nftDataAccount = await program.account.nftData.fetch(nftDataPda);
      
      // Check if the current user owns the NFT
      return nftDataAccount.owner.equals(publicKey);
    } catch (err) {
      console.error('Error checking NFT ownership:', err);
      return false;
    }
  }, [publicKey, getProvider]);

  const estimateSellPrice = useCallback(async (nftMint: PublicKey): Promise<number | null> => {
    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const nftDataAccount = await program.account.nftData.fetch(nftDataPda);
      
      // Return the last price (would need bonding curve calculation for current sell price)
      return nftDataAccount.lastPrice.toNumber() / 1e9;
    } catch (err) {
      console.error('Error estimating sell price:', err);
      return null;
    }
  }, [getProvider]);

  return {
    sellNft,
    canSellNft,
    estimateSellPrice,
    isLoading,
    error,
  };
};
