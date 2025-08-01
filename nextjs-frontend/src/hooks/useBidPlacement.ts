import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';

import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';
export const useBidPlacement = () => {
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

  const placeBid = useCallback(async (
    nftMint: PublicKey,
    amount: number,
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

      const [bidPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bid'),
          bidListingPda.toBuffer(),
          publicKey.toBuffer()
        ],
        PROGRAM_ID
      );

      const [bidEscrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bid_escrow'), bidPda.toBuffer()],
        PROGRAM_ID
      );

      // Derive bonding curve pool PDA - assuming it's derived from collection mint
      // You may need to adjust this based on actual derivation logic
      const [bondingCurvePoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), nftMint.toBuffer()], 
        PROGRAM_ID
      );

      // Convert amount from SOL to lamports
      const amountInLamports = new BN(amount * 1e9);

      const tx = await program.methods
        .placeBid({
          amount: amountInLamports,
        })
        .accounts({
          bidder: publicKey,
          bidListing: bidListingPda,
          bid: bidPda,
          bidEscrow: bidEscrowPda,
          bondingCurvePool: bondingCurvePoolPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('Bid placed successfully:', signature);
      return bidPda;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connection, sendTransaction, getProvider]);

  const getBid = useCallback(async (bidPubkey: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      // Fetch bid account data
      const bidData = await (program.account as any).bid.fetch(bidPubkey);
      
      return {
        bidId: bidData.bidId.toNumber(),
        details: {
          nftMint: bidData.details.nftMint,
          bidder: bidData.details.bidder,
          amount: bidData.details.amount.toNumber(),
          premiumBp: bidData.details.premiumBp,
        },
        timing: {
          createdAt: bidData.timing.createdAt.toNumber(),
          expiresAt: bidData.timing.expiresAt.toNumber(),
          duration: bidData.timing.duration.toNumber(),
        },
        outcome: {
          status: bidData.outcome.status,
          acceptedAt: bidData.outcome.acceptedAt?.toNumber() || null,
          cancelledAt: bidData.outcome.cancelledAt?.toNumber() || null,
          cancellationReason: bidData.outcome.cancellationReason || null,
        },
        bump: bidData.bump,
      };
    } catch (error) {
      console.error('Error fetching bid:', error);
      throw error;
    }
  }, [getProvider]);

  const getUserBids = useCallback(async (userPubkey: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      // Get all bid accounts where bidder equals userPubkey
      const bids = await (program.account as any).bid.all([
        {
          memcmp: {
            offset: 8 + 8 + 32, // Skip discriminator (8) + bidId (8) + details struct start, then nftMint (32) to get to bidder field
            bytes: userPubkey.toBase58(),
          },
        },
      ]);

      return bids.map((bid: any) => ({
        bidId: bid.account.bidId.toNumber(),
        nftMint: bid.account.details.nftMint,
        bidder: bid.account.details.bidder,
        amount: bid.account.details.amount.toNumber(),
        status: Object.keys(bid.account.outcome.status)[0], // Get the status variant name
        createdAt: bid.account.timing.createdAt.toNumber(),
        expiresAt: bid.account.timing.expiresAt.toNumber(),
      }));
    } catch (error) {
      console.error('Error fetching user bids:', error);
      return [];
    }
  }, [getProvider]);

  const getBidsForNft = useCallback(async (nftMint: PublicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);
      
      // Get all bid accounts where nftMint equals the specified mint
      const bids = await (program.account as any).bid.all([
        {
          memcmp: {
            offset: 8 + 8, // Skip discriminator (8) + bidId (8) to get to details.nftMint field
            bytes: nftMint.toBase58(),
          },
        },
      ]);

      return bids.map((bid: any) => ({
        bidId: bid.account.bidId.toNumber(),
        nftMint: bid.account.details.nftMint,
        bidder: bid.account.details.bidder,
        amount: bid.account.details.amount.toNumber(),
        status: Object.keys(bid.account.outcome.status)[0], // Get the status variant name
        createdAt: bid.account.timing.createdAt.toNumber(),
        expiresAt: bid.account.timing.expiresAt.toNumber(),
      }));
    } catch (error) {
      console.error('Error fetching bids for NFT:', error);
      return [];
    }
  }, [getProvider]);

  const getHighestBid = useCallback(async (nftMint: PublicKey) => {
    try {
      const bids = await getBidsForNft(nftMint);
      const activeBids = bids.filter((bid: any) => bid.status === 'Active');
      
      if (activeBids.length === 0) return null;
      
      return activeBids.reduce((highest: any, current: any) => 
        current.amount > highest.amount ? current : highest
      );
    } catch (error) {
      console.error('Error getting highest bid:', error);
      throw error;
    }
  }, [getBidsForNft]);

  return {
    placeBid,
    getBid,
    getUserBids,
    getBidsForNft,
    getHighestBid,
    isLoading,
  };
};

