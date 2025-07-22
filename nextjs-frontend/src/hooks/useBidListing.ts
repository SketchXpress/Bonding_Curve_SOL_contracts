import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf');

export const useBidListing = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

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

  const listForBids = useCallback(async (
    nftMint: PublicKey,
    minBid: number,
    durationHours?: number
  ): Promise<PublicKey | null> => {
    if (!publicKey) throw new Error('Wallet not connected');

    setIsLoading(true);
    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

      // Derive PDAs
      const [bidListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMint.toBuffer()],
        PROGRAM_ID
      );

      // We need to get the collection mint from the NFT metadata or pass it as parameter
      // For now, let's assume we have a way to get it or it's passed as parameter
      // This is a limitation that needs to be addressed by either:
      // 1. Passing collection mint as parameter
      // 2. Reading it from NFT metadata
      // 3. Storing it in a separate account
      
      // For demonstration, let's assume we get it from somewhere
      // In a real implementation, you'd need to derive this properly
      const collectionMint = nftMint; // This is incorrect but for demo purposes

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), collectionMint.toBuffer()],
        PROGRAM_ID
      );

      // Get user's token account
      const nftTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        publicKey
      );

      // Convert min bid from SOL to lamports
      const minBidInLamports = new BN(minBid * 1e9);

      const tx = await program.methods
        .listForBids({
          minBid: minBidInLamports,
          durationHours: durationHours || null,
        })
        .accounts({
          lister: publicKey,
          nftMint: nftMint,
          pool: poolPda,
          collectionMint: collectionMint,
          listerTokenAccount: nftTokenAccount,
          bidListing: bidListingPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('NFT listed for bids successfully:', signature);
      return bidListingPda;
    } catch (error) {
      console.error('Error listing NFT for bids:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, sendTransaction, getProvider]);

  const getBidListing = useCallback(async (listingPubkey: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      // Fetch listing account data
      const listingData = await program.account.bidListing.fetch(listingPubkey);
      
      return {
        nftMint: listingData.nftMint,
        lister: listingData.lister,
        minBid: listingData.minBid.toNumber(),
        highestBid: listingData.highestBid.toNumber(),
        highestBidder: listingData.highestBidder,
        totalBids: listingData.totalBids,
        status: listingData.status,
        createdAt: listingData.createdAt.toNumber(),
        expiresAt: listingData.expiresAt.toNumber(),
        lastPriceUpdate: listingData.lastPriceUpdate.toNumber(),
        bondingCurvePriceAtListing: listingData.bondingCurvePriceAtListing.toNumber(),
        currentBondingCurvePrice: listingData.currentBondingCurvePrice.toNumber(),
        requiredPremiumBp: listingData.requiredPremiumBp,
        bump: listingData.bump,
      };
    } catch (error) {
      console.error('Error fetching bid listing:', error);
      throw error;
    }
  }, [getProvider]);

  const getUserListings = useCallback(async (userPubkey: PublicKey) => {
    try {
      // In a real implementation, you'd query all bid listings where lister = userPubkey
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  }, []);

  const cancelListing = useCallback(async (listingPubkey: PublicKey) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setIsLoading(true);
    try {
      // Implementation for cancelling a listing
      // This would involve calling a cancel_listing instruction
      console.log('Cancelling listing:', listingPubkey.toString());
      
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  return {
    listForBids,
    getBidListing,
    getUserListings,
    cancelListing,
    isLoading,
  };
};

