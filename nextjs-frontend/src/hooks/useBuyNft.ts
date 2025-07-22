'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf');

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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive NFT data PDA
      const [nftDataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('nft_data'),
          params.nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Get NFT data to find the pool and current owner
      const nftDataAccount = await program.account.nftData.fetch(nftDataPda);
      const poolAddress = nftDataAccount.collectionId; // Assuming collection_id references the pool
      const currentOwner = nftDataAccount.owner;

      // Derive user accounts
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
      const poolAccount = await program.account.bondingCurvePool.fetch(nftDataAccount.collectionId);
      
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
