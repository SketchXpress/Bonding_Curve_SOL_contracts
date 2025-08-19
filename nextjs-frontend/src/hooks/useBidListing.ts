import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';
'use client';


import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';

// Import anchor using require to avoid TypeScript issues
const anchor = require('@coral-xyz/anchor');
const { Program, AnchorProvider, web3, BN } = anchor;
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
        signTransaction: async (tx: Transaction) => {
          const signed = await sendTransaction(tx, connection);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
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
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Derive PDAs
      const [bidListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMint.toBuffer()],
        PROGRAM_ID
      );

      // Get the collection mint from the minter tracker
      const [minterTrackerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('minter'), nftMint.toBuffer()],
        PROGRAM_ID
      );

      console.log('🔍 Fetching minter tracker from PDA:', minterTrackerPda.toString());
      
      // Check if the minter tracker account exists first
      const minterAccountInfo = await connection.getAccountInfo(minterTrackerPda);
      if (!minterAccountInfo) {
        console.log('❌ Minter tracker account does not exist:', minterTrackerPda.toString());
        throw new Error(`This NFT cannot be listed for bids because it was not minted through the bonding curve system. Only NFTs minted through the platform can be listed.`);
      }

      // Fetch minter tracker to get collection mint
      const minterTrackerData = await (program.account as any).minterTracker.fetch(minterTrackerPda);
      console.log('✅ Minter tracker fetched successfully:', minterTrackerData);
      const collectionMint = minterTrackerData.collection;

      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve-pool'), collectionMint.toBuffer()],
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
      console.error('❌ Error listing NFT for bids:', error);
      console.error('❌ Error details:', {
        nftMint: nftMint.toString(),
        publicKey: publicKey?.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, sendTransaction, getProvider]);

  const getBidListing = useCallback(async (listingPubkey: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      // Fetch listing account data
      const listingData = await (program.account as any).bidListing.fetch(listingPubkey);
      
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
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      // Get all bid listing accounts where lister equals userPubkey
      const bidListings = await (program.account as any).bidListing.all([
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator (8) + nftMint (32) to get to lister field
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      return bidListings.map((listing: any) => ({
        publicKey: listing.publicKey,
        account: {
          nftMint: listing.account.nftMint,
          lister: listing.account.lister,
          minBid: listing.account.minBid.toNumber(),
          highestBid: listing.account.highestBid.toNumber(),
          highestBidder: listing.account.highestBidder,
          totalBids: listing.account.totalBids,
          status: listing.account.status,
          createdAt: listing.account.createdAt.toNumber(),
          expiresAt: listing.account.expiresAt.toNumber(),
          lastPriceUpdate: listing.account.lastPriceUpdate.toNumber(),
          bondingCurvePriceAtListing: listing.account.bondingCurvePriceAtListing.toNumber(),
          currentBondingCurvePrice: listing.account.currentBondingCurvePrice.toNumber(),
          requiredPremiumBp: listing.account.requiredPremiumBp,
          bump: listing.account.bump,
        },
      }));
    } catch (error) {
      console.error('Error fetching user listings:', error);
      return [];
    }
  }, [getProvider]);

  const cancelListing = useCallback(async (listingPubkey: PublicKey) => {
    if (!publicKey) throw new Error('Wallet not connected');

    setIsLoading(true);
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Get listing data to find the NFT mint
      const listingData = await (program.account as any).bidListing.fetch(listingPubkey);
      const nftMint = listingData.nftMint;

      // Verify that the connected wallet is the lister
      if (!listingData.lister.equals(publicKey)) {
        throw new Error('You are not authorized to cancel this listing');
      }

      // Check if listing is active
      if (listingData.status.toString() !== 'Active') {
        throw new Error('Listing is not active and cannot be cancelled');
      }

      // Check if there are active bids (highest bid > 0)
      if (listingData.highestBid.toNumber() > 0) {
        throw new Error('Cannot cancel listing with active bids. Please accept the highest bid or wait for expiration.');
      }

      // Get user's token account to verify they still own the NFT
      const nftTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        publicKey
      );

      // TODO: Once the contract is rebuilt and deployed with cancelListing instruction,
      // and the IDL is regenerated, uncomment the following code:
      
      /*
      const tx = await program.methods
        .cancelListing()
        .accounts({
          lister: publicKey,
          nftMint: nftMint,
          bidListing: listingPubkey,
          listerTokenAccount: nftTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Listing cancelled successfully:', signature);
      return true;
      */

      throw new Error('Cancel listing functionality is implemented in the contract but requires the program to be rebuilt and redeployed with the new instruction. Please rebuild the contract and regenerate the IDL.');
      
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, sendTransaction, getProvider]);

  return {
    listForBids,
    getBidListing,
    getUserListings,
    cancelListing,
    isLoading,
  };
};

