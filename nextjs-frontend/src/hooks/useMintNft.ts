'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Keypair
} from '@solana/web3.js';
import { PROGRAM_ID } from '@/utils/idl';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Import SPL Token functions using require to avoid TypeScript issues
const { getAssociatedTokenAddress } = require('@solana/spl-token');

// Import anchor with require to avoid TypeScript issues
const anchor = require('@coral-xyz/anchor');
const { Program, AnchorProvider } = anchor;
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { IDL } from '../utils/idl';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface MintNftParams {
  collectionMint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}

export const useMintNft = () => {
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
        signTransaction: async (tx: any) => {
          const signed = await sendTransaction(tx, connection);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          return txs;
        },
      },
      { commitment: 'confirmed' }
    );
  }, [connection, publicKey, sendTransaction]);

  const mintNft = useCallback(async (params: MintNftParams): Promise<PublicKey | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider) as any;

      // Generate new keypair for NFT mint
      const nftMint = Keypair.generate();

      // Derive pool PDA
      const [poolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          params.collectionMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Derive NFT escrow PDA
      const [nftEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          nftMint.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Derive minter tracker PDA
      const [minterTrackerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('minter'),
          nftMint.publicKey.toBuffer(),
        ],
        PROGRAM_ID
      );

      // Derive metadata account
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Get associated token account for minter
      const minterTokenAccount = await getAssociatedTokenAddress(
        nftMint.publicKey,
        publicKey
      );

      const tx = await program.methods
        .mintNft({
          name: params.name,
          symbol: params.symbol,
          uri: params.uri,
        })
        .accounts({
          minter: publicKey,
          bondingCurvePool: poolPda,
          nftMint: nftMint.publicKey,
          minterTokenAccount: minterTokenAccount,
          nftEscrow: nftEscrowPda,
          minterTracker: minterTrackerPda,
          metadata: metadataAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([nftMint])
        .transaction();

      const signature = await sendTransaction(tx, connection, {
        signers: [nftMint]
      });
      
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('NFT minted with signature:', signature);
      console.log('NFT mint:', nftMint.publicKey.toString());

      return nftMint.publicKey;
    } catch (err) {
      console.error('Error minting NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to mint NFT');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const getNftEscrowData = useCallback(async (nftMint: PublicKey) => {
    if (!publicKey) return null;

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider) as any;
      
      const [nftEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('escrow'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const nftEscrowAccount = await program.account.nftEscrow.fetch(nftEscrowPda);
      
      return {
        address: nftEscrowPda,
        data: nftEscrowAccount,
      };
    } catch (err) {
      console.error('Error fetching NFT escrow data:', err);
      return null;
    }
  }, [publicKey, getProvider]);

  const getMinterTracker = useCallback(async (nftMint: PublicKey) => {
    if (!publicKey) return null;

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider) as any;
      
      const [minterTrackerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('minter'),
          nftMint.toBuffer(),
        ],
        PROGRAM_ID
      );

      const minterTrackerAccount = await program.account.minterTracker.fetch(minterTrackerPda);
      
      return {
        address: minterTrackerPda,
        data: minterTrackerAccount,
      };
    } catch (err) {
      console.error('Error fetching minter tracker:', err);
      return null;
    }
  }, [publicKey, getProvider]);

  return {
    mintNft,
    getNftEscrowData,
    getMinterTracker,
    isLoading,
    error,
  };
};
