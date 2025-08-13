'use client';

import { useState, useCallback } from 'react';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  Keypair
} from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { BondingCurveSystem } from '../types/bonding_curve_system';
import { PROGRAM_ID, IDL } from '../utils/idl';
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface CreateCollectionNftParams {
  name: string;
  symbol: string;
  uri: string;
}

export const useCreateCollectionNft = () => {
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

  const createCollectionNft = useCallback(async (params: CreateCollectionNftParams): Promise<PublicKey | null> => {
    if (!publicKey) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      const program = new Program(IDL as any, PROGRAM_ID, provider);

      // Generate new keypair for collection mint
      const collectionMint = Keypair.generate();

      // Derive metadata account
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.publicKey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Derive master edition account
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.publicKey.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        collectionMint.publicKey,
        publicKey
      );

      const tx = await program.methods
        .createCollectionNft({
          name: params.name,
          symbol: params.symbol,
          uri: params.uri,
        })
        .accounts({
          payer: publicKey,
          collectionMint: collectionMint.publicKey,
          metadataAccount,
          masterEditionAccount,
          tokenAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([collectionMint])
        .transaction();

      const signature = await sendTransaction(tx, connection, {
        signers: [collectionMint]
      });
      
      await connection.confirmTransaction(signature, 'confirmed');

      console.log('Collection NFT created with signature:', signature);
      console.log('Collection mint:', collectionMint.publicKey.toString());

      return collectionMint.publicKey;
    } catch (err) {
      console.error('Error creating collection NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to create collection NFT');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, getProvider, sendTransaction, connection]);

  const getCollectionMetadata = useCallback(async (collectionMint: PublicKey) => {
    try {
      // Derive metadata account
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(metadataAccount);
      if (!accountInfo) return null;

      // You would need to deserialize the metadata here
      // This is a simplified version
      return {
        metadataAccount,
        exists: true,
        // Add more metadata fields as needed
      };
    } catch (err) {
      console.error('Error fetching collection metadata:', err);
      return null;
    }
  }, [connection]);

  return {
    createCollectionNft,
    getCollectionMetadata,
    isLoading,
    error,
  };
};
