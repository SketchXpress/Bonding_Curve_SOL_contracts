import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import idl from '../idl/bonding_curve_system.json';

const PROGRAM_ID = new PublicKey('5PCH5ww9gXvkzJHq6zM8kkgnrVxmG2uKHrQTJk4LHJf');

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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;

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
          systemProgram: SystemProgram.programId,
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
      const program = new Program(idl as any, PROGRAM_ID, provider) as Program<BondingCurveSystem>;
      
      // Fetch bid account data
      const bidData = await program.account.bid.fetch(bidPubkey);
      
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
      // In a real implementation, you'd query all bids where bidder = userPubkey
      // This might involve using getProgramAccounts with filters
      
      // For now, return mock data
      return [
        {
          bidId: 1,
          nftMint: new PublicKey('11111111111111111111111111111111'),
          bidder: userPubkey,
          amount: 100000000, // 0.1 SOL in lamports
          status: 'Active',
          createdAt: Date.now() / 1000,
          expiresAt: Date.now() / 1000 + 86400, // 24 hours from now
        },
      ];
    } catch (error) {
      console.error('Error fetching user bids:', error);
      throw error;
    }
  }, []);

  const getBidsForNft = useCallback(async (nftMint: PublicKey) => {
    try {
      // In a real implementation, you'd query all bids for a specific NFT
      // This might involve using getProgramAccounts with filters
      
      // For now, return mock data
      return [
        {
          bidId: 1,
          nftMint: nftMint,
          bidder: new PublicKey('11111111111111111111111111111111'),
          amount: 100000000, // 0.1 SOL in lamports
          status: 'Active',
          createdAt: Date.now() / 1000,
          expiresAt: Date.now() / 1000 + 86400, // 24 hours from now
        },
      ];
    } catch (error) {
      console.error('Error fetching bids for NFT:', error);
      throw error;
    }
  }, []);

  const getHighestBid = useCallback(async (nftMint: PublicKey) => {
    try {
      const bids = await getBidsForNft(nftMint);
      const activeBids = bids.filter(bid => bid.status === 'Active');
      
      if (activeBids.length === 0) return null;
      
      return activeBids.reduce((highest, current) => 
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

