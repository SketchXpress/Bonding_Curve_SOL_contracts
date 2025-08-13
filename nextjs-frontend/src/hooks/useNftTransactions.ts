'use client';

import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '../utils/solana-constants';

// Import SPL Token functions directly to avoid package conflicts
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Helper function to safely stringify any error object
const safeStringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    try {
      const errorObj = error as any;
      if (errorObj.message) {
        return String(errorObj.message);
      }
      if (errorObj.error && errorObj.error.message) {
        return String(errorObj.error.message);
      }
      if (errorObj.logs && Array.isArray(errorObj.logs)) {
        return errorObj.logs.join('\n');
      }
      
      return JSON.stringify(error, null, 2);
    } catch (stringifyError) {
      return `[Complex Error Object: ${typeof error}]`;
    }
  }
  
  return `[Unknown Error: ${typeof error}]`;
};

// Named export for useMintNft
export const useMintNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string | null>(null);

  const mintNft = async (
    name: string,
    symbol: string,
    uri: string,
    collectionMint: string
  ) => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
      return null;
    }

    // Check if wallet supports transaction signing
    if (!wallet.signTransaction) {
      setError('Wallet does not support transaction signing');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Validate inputs
      if (!name || !symbol || !uri || !collectionMint) {
        throw new Error('Name, symbol, URI, and collection mint are required');
      }
      
      console.log('Minting NFT with collection:', { name, symbol, uri, collectionMint });
      
      // Add debugging for program context
      console.log('Program ID from context:', program.programId?.toString());
      console.log('Connection endpoint:', program.provider.connection.rpcEndpoint);
      
      // Generate a new keypair for the NFT mint
      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;

      console.log('Generated NFT mint keypair:', nftMintKeypair.publicKey.toString());
      
      // Get the associated token address for the NFT (minter token account)
      const minterTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey
      );
      
      // --- ADD COMPUTE UNIT LIMIT INSTRUCTION --- 
      const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({ 
        units: 400000 // Request 400,000 CUs (adjust if needed)
      });
      // --- END ADD COMPUTE UNIT LIMIT INSTRUCTION ---
      
      console.log('About to call minimal mintNft with accounts:', {
        minter: wallet.publicKey.toString(),
        nftMint: nftMint.toString(),
        minterTokenAccount: minterTokenAccount.toString()
      });

      // Debug the program IDs being used
      console.log('TOKEN_PROGRAM_ID:', TOKEN_PROGRAM_ID.toString());
      console.log('ASSOCIATED_TOKEN_PROGRAM_ID:', ASSOCIATED_TOKEN_PROGRAM_ID.toString());
      console.log('TOKEN_METADATA_PROGRAM_ID:', TOKEN_METADATA_PROGRAM_ID.toString());

      // Convert collection mint string to PublicKey
      const collectionMintPubkey = new PublicKey(collectionMint);
      
      // Derive pool PDA for the collection
      const [poolAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('bonding-curve-pool'),
          collectionMintPubkey.toBuffer(),
        ],
        program.programId
      );

      // Derive metadata account PDA for NFT
      const [metadataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Derive collection metadata account PDA
      const [collectionMetadataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMintPubkey.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      console.log('Derived addresses:');
      console.log('- NFT metadata:', metadataAddress.toString());
      console.log('- Collection metadata:', collectionMetadataAddress.toString());
      console.log('- Pool:', poolAddress.toString());

      // Execute the transaction to mint the NFT with collection integration
      const tx = await program.methods
        .mintNft({
          name: name,
          symbol: symbol,
          uri: uri,
          collectionMint: collectionMintPubkey
        })
        .accounts({
          minter: wallet.publicKey,
          nftMint: nftMint,
          minterTokenAccount: minterTokenAccount,
          collectionMint: collectionMintPubkey,
          pool: poolAddress,
          metadata: metadataAddress,
          collectionMetadata: collectionMetadataAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY
        })
        .signers([nftMintKeypair])
        .preInstructions([computeUnitLimitInstruction])
        .rpc({
          skipPreflight: false,
          commitment: 'confirmed'
        });
      
      console.log('NFT minted successfully with signature:', tx);
      
      // Set the transaction signature and NFT mint address
      setTxSignature(tx);
      setNftMintAddress(nftMint.toString());
      
      return { 
        tx, 
        nftMint: nftMint.toString()
      };
    } catch (error) {
      const errorMessage = safeStringifyError(error);
      console.error('Mint NFT error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mintNft, loading, error, txSignature, nftMintAddress };
};

// Named export for useSellNft
export const useSellNft = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const sellNft = async (nftMintAddress: string, poolAddress: string) => {
    if (!program || !wallet.publicKey) {
      setError("Program not initialized or wallet not connected");
      return null;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Validate NFT mint address
      if (!isValidPublicKeyFormat(nftMintAddress)) {
        throw new Error("Invalid NFT mint address format");
      }
      const nftMint = safePublicKey(nftMintAddress);
      if (!nftMint) {
        throw new Error("Invalid NFT mint address");
      }

      // Validate pool address
      if (!isValidPublicKeyFormat(poolAddress)) {
        throw new Error("Invalid pool address format");
      }
      const pool = safePublicKey(poolAddress);
      if (!pool) {
        throw new Error("Invalid pool address");
      }

      // Get pool data to retrieve collection mint AND CREATOR
      const poolData = await (program.account as any).bondingCurvePool.fetch(pool);
      const collectionMint = poolData.collection as PublicKey;
      const creator = poolData.creator as PublicKey; // <-- Get the creator public key

      // Add this code to derive collection metadata PDA
      const [collectionMetadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          collectionMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Find NFT escrow PDA
      const [escrow] = PublicKey.findProgramAddressSync(
        [Buffer.from("nft-escrow"), nftMint.toBuffer()],
        program.programId
      );

      // Get the associated token address for the NFT
      const sellerNftTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey
      );

      // Verify the seller owns the NFT (optional but good practice)
      try {
        const tokenAccountInfo = await getAccount(
          program.provider.connection,
          sellerNftTokenAccount
        );
        if (tokenAccountInfo.amount !== BigInt(1)) {
          throw new Error("You do not own this NFT or the token account is incorrect.");
        }
      } catch (err) {
        // Handle cases where the token account might not exist yet or other errors
        console.error("Verification Error:", err);
        throw new Error("Failed to verify NFT ownership. Ensure the token account exists.");
      }

      // Find Metaplex metadata account PDA
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Find Metaplex master edition account PDA
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      // Execute the transaction to sell (burn) the NFT and retrieve SOL from escrow
      const tx = await program.methods
        .sellNft()
        .accounts({
          seller: wallet.publicKey,
          pool: pool,
          escrow: escrow,
          creator: creator, // <-- ADD THE CREATOR ACCOUNT HERE
          nftMint: nftMint,
          sellerNftTokenAccount: sellerNftTokenAccount,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
          collectionMint: collectionMint,
          collectionMetadata: collectionMetadata,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc({
          skipPreflight: false, // Consider setting to true for debugging if needed
          commitment: "confirmed",
        });

      console.log("NFT sold successfully with signature:", tx);

      setTxSignature(tx);
      return tx;
    } catch (err) {
      const errorMessage = safeStringifyError(err); // Use the helper function
      console.error("Error selling NFT:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sellNft, loading, error, txSignature };
};
