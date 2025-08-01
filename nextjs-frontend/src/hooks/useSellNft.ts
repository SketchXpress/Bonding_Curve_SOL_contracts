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
import { IDL } from '../utils/idl';

const PROGRAM_ID = new PublicKey('Du1BzHwLWSic1Hhmyszy5opgBn1wBUvvxydwfn56uoqa');
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

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
      const program = new Program(IDL as any, provider);

      // Derive NFT escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft-escrow'),
          params.nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get escrow data to find the pool
      const escrowAccount = await (program.account as any).nftEscrow.fetch(escrowPda);

      // Get pool data to find creator
      // For this, we'll need to find the pool by collection mint or get it from escrow if it has pool reference
      // Let's assume we can derive the pool from the NFT mint or we have it stored in escrow
      // For now, let's get it from the existing pool structures

      // Get seller's token account
      const sellerTokenAccount = await getAssociatedTokenAddress(
        params.nftMint,
        publicKey
      );

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

      // Get the minter tracker to find collection mint and creator
      const [minterTrackerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('minter'), params.nftMint.toBuffer()],
        PROGRAM_ID
      );

      const minterTrackerData = await (program.account as any).minterTracker.fetch(minterTrackerPda);
      const collectionMint = minterTrackerData.collection;
      const creator = minterTrackerData.originalMinter;

      // Derive pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), collectionMint.toBuffer()],
        PROGRAM_ID
      );

      // Derive collection metadata account
      const [collectionMetadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const tx = await program.methods
        .sellNft()
        .accounts({
          seller: publicKey,
          pool: poolPda,
          escrow: escrowPda,
          creator: creator,
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
