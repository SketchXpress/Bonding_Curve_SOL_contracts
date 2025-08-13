'use client';

import { useState, useCallback } from 'react';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, getMint } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';
export interface BidManagementResult {
  isLoading: boolean;
  error: string | null;
  cancelBid: (bidAccount: PublicKey, bidId: number) => Promise<string | null>;
  acceptBid: (bidListingAccount: PublicKey, bidAccount: PublicKey, bidId: number) => Promise<string | null>;
}

export const useBidManagement = (): BidManagementResult => {
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

  const cancelBid = useCallback(async (bidAccount: PublicKey, bidId: number): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Get bid data to find NFT mint and bid listing
      const bidData = await (program.account as any).bid.fetch(bidAccount);
      const nftMint = bidData.details.nftMint;

      // Derive the bid listing account
      const [bidListingAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-listing'), nftMint.toBuffer()],
        PROGRAM_ID
      );

      // Derive the bid escrow account
      const [bidEscrowAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-escrow'), bidAccount.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .cancelBid({ bidId: new BN(bidId) })
        .accounts({
          bidder: publicKey,
          nftMint,
          bidListing: bidListingAccount,
          bid: bidAccount,
          bidEscrow: bidEscrowAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Bid cancelled successfully:', tx);
      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel bid';
      console.error('Cancel bid error:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider]);

  const acceptBid = useCallback(async (bidListingAccount: PublicKey, bidAccount: PublicKey, bidId: number): Promise<string | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Get bid listing data
      const bidListingData = await (program.account as any).bidListing.fetch(bidListingAccount);
      const nftMint = bidListingData.nftMint;

      // Get bid data
      const bidData = await (program.account as any).bid.fetch(bidAccount);
      const bidder = bidData.details.bidder;

      // Derive the minter tracker account
      const [minterTrackerAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('minter'), nftMint.toBuffer()],
        PROGRAM_ID
      );

      // Derive the bid escrow account
      const [bidEscrowAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid-escrow'), bidAccount.toBuffer()],
        PROGRAM_ID
      );

      // Get token accounts
      const sellerTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        publicKey
      );

      const bidderTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        bidder
      );

      // Get creator from minter tracker
      const minterTrackerData = await (program.account as any).minterTracker.fetch(minterTrackerAccount);
      const creator = minterTrackerData.originalMinter;
      const collection = minterTrackerData.collection;

      const creatorTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        creator
      );

      // Platform fee account - since platform creates collections, we can get the collection mint authority
      // The collection mint authority is set to the platform when the collection is created
      const collectionMintInfo = await getMint(connection, collection);
      const platformFeeAccount = collectionMintInfo.mintAuthority;
      
      if (!platformFeeAccount) {
        throw new Error('Collection mint authority not found - platform fee account cannot be determined');
      }

      // Collection distribution account
      const [collectionDistributionAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection-distribution'), collection.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .acceptBid({ bidId: new BN(bidId) })
        .accounts({
          currentHolder: publicKey,
          bidListing: bidListingAccount,
          bid: bidAccount,
          minterTracker: minterTrackerAccount,
          bidderTokenAccount,
          bidEscrow: bidEscrowAccount,
          sellerTokenAccount,
          creatorTokenAccount,
          platformFeeAccount,
          collectionDistribution: collectionDistributionAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Bid accepted successfully:', tx);
      return tx;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
      console.error('Accept bid error:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider]);

  return {
    isLoading,
    error,
    cancelBid,
    acceptBid
  };
};
