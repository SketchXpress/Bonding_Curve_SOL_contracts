import { useState, useCallback } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import IDL from '../../target/idl/bonding_curve_system.json';

export const useBidManagement = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelBid = useCallback(
    async (nftMint: PublicKey, bidId: number) => {
      if (!wallet.publicKey || !anchorWallet) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const program = new Program<BondingCurveSystem>(IDL, anchorWallet);

        // Derive PDAs with correct seeds
        const [bidListingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("bid-listing"), nftMint.toBuffer()],
          program.programId
        );

        const bidIdBytes = new Uint8Array(8);
        new DataView(bidIdBytes.buffer).setBigUint64(0, BigInt(bidId), true);

        const [bidPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bid"),
            nftMint.toBuffer(),
            bidIdBytes
          ],
          program.programId
        );

        const [escrowPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bid-escrow"),
            nftMint.toBuffer(),
            wallet.publicKey.toBuffer(),
            bidIdBytes
          ],
          program.programId
        );

        const transaction = await program.methods
          .cancelBid({ bidId })
          .accounts({
            bidder: wallet.publicKey,
            nftMint,
            bidListing: bidListingPda,
            bid: bidPda,
            bidEscrow: escrowPda,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const signature = await wallet.sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        console.log('Bid cancelled successfully:', signature);
        return signature;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel bid';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet, anchorWallet, connection]
  );

  const acceptBid = useCallback(
    async (nftMint: PublicKey, bidId: number) => {
      if (!wallet.publicKey || !anchorWallet) {
        throw new Error('Wallet not connected');
      }

      setLoading(true);
      setError(null);

      try {
        const program = new Program<BondingCurveSystem>(IDL, anchorWallet);

        // Derive PDAs
        const [bidListingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("bid-listing"), nftMint.toBuffer()],
          program.programId
        );

        const bidIdBytes = new Uint8Array(8);
        new DataView(bidIdBytes.buffer).setBigUint64(0, BigInt(bidId), true);

        const [bidPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bid"),
            nftMint.toBuffer(),
            bidIdBytes
          ],
          program.programId
        );

        const [minterTrackerPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("minter-tracker"), nftMint.toBuffer()],
          program.programId
        );

        // Get token accounts
        const bidderTokenAccount = await getAssociatedTokenAddress(
          new PublicKey("So11111111111111111111111111111111111111112"), // WSOL mint
          wallet.publicKey
        );

        const [bidEscrowPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("bid-escrow"),
            nftMint.toBuffer(),
            wallet.publicKey.toBuffer(),
            bidIdBytes
          ],
          program.programId
        );

        const sellerTokenAccount = await getAssociatedTokenAddress(
          new PublicKey("So11111111111111111111111111111111111111112"), // WSOL mint
          wallet.publicKey
        );

        const transaction = await program.methods
          .acceptBid({ bidId })
          .accounts({
            currentHolder: wallet.publicKey,
            bidListing: bidListingPda,
            bid: bidPda,
            minterTracker: minterTrackerPda,
            bidderTokenAccount,
            bidEscrow: bidEscrowPda,
            sellerTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .transaction();

        const signature = await wallet.sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'confirmed');

        console.log('Bid accepted successfully:', signature);
        return signature;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [wallet, anchorWallet, connection]
  );

  return {
    cancelBid,
    acceptBid,
    loading,
    error,
  };
};
