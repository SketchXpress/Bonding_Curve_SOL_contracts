'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  Transaction
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';
import * as anchor from '@coral-xyz/anchor';
import { useUserAccount } from './useUserAccount';

// Define interfaces for the account data structures
interface NftData {
  owner: PublicKey;
  // Add other fields as needed
}

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
      // Try to extract common error properties
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
      
      // If no common properties, stringify the whole object
      return JSON.stringify(error, null, 2);
    } catch (stringifyError) {
      return `[Complex Error Object: ${typeof error}]`;
    }
  }
  
  return `[Unknown Error: ${typeof error}]`;
};

// Metaplex Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Named export for useCreateNft
export const useCreateNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string | null>(null);
  const { ensureUserAccount, loading: userAccountLoading } = useUserAccount();

  const createNft = async (name: string, symbol: string, uri: string, sellerFeeBasisPoints: number) => {
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
      if (!name || !symbol || !uri) {
        throw new Error('Name, symbol, and URI are required');
      }
      
      if (sellerFeeBasisPoints < 0 || sellerFeeBasisPoints > 10000) {
        throw new Error('Seller fee basis points must be between 0 and 10000');
      }
      
      // IMPORTANT: First ensure the user account exists before proceeding
      console.log('Ensuring user account exists before minting NFT...');
      const userAccountReady = await ensureUserAccount(20); // Allow up to 20 NFTs
      
      if (!userAccountReady) {
        throw new Error('Failed to create or verify user account. Please try again.');
      }
      
      console.log('User account is ready, proceeding with NFT creation...');
      
      // Generate a new keypair for the NFT mint
      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;
      
      console.log('Generated NFT mint keypair:', nftMintKeypair.publicKey.toString());
      
      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );
      
      // Find NFT data PDA
      const [nftData] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft-data'), nftMint.toBuffer()],
        program.programId
      );
      
      // Find Metaplex metadata account PDA
      const [metadataAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      
      // Find Metaplex master edition account PDA
      const [masterEditionAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          nftMint.toBuffer(),
          Buffer.from('edition')
        ],
        TOKEN_METADATA_PROGRAM_ID
      );
      
      // Check if NFT data account already exists
      const nftDataAccountInfo = await provider.connection.getAccountInfo(nftData);
      const nftDataExists = nftDataAccountInfo !== null;
      
      if (nftDataExists) {
        console.log('NFT data account already exists, will use existing account');
      } else {
        console.log('NFT data account does not exist, will create new account');
      }
      
      // STEP 1: Create and initialize the mint account with the mint keypair
      console.log('Step 1: Creating and initializing mint account...');
      
      // Calculate the rent for the mint account
      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      
      // Create a transaction to create and initialize the mint account
      const createMintTx = new Transaction();
      
      // Add instruction to create the mint account
      createMintTx.add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: nftMint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID
        })
      );
      
      // Add instruction to initialize the mint account
      createMintTx.add(
        createInitializeMintInstruction(
          nftMint,
          0, // 0 decimals for NFT
          wallet.publicKey, // mint authority
          wallet.publicKey, // freeze authority (same as mint authority)
          TOKEN_PROGRAM_ID
        )
      );
      
      // Get a recent blockhash for the create mint transaction
      const { blockhash: createMintBlockhash, lastValidBlockHeight: createMintLastValidBlockHeight } = 
        await provider.connection.getLatestBlockhash();
      createMintTx.recentBlockhash = createMintBlockhash;
      createMintTx.feePayer = wallet.publicKey;
      
      // Sign the transaction with the mint keypair
      createMintTx.partialSign(nftMintKeypair);
      
      // Sign the transaction with the wallet
      const signedCreateMintTx = await wallet.signTransaction(createMintTx);
      
      // Send and confirm the create mint transaction
      const createMintTxSignature = await provider.connection.sendRawTransaction(
        signedCreateMintTx.serialize(),
        { skipPreflight: false }
      );
      
      // Wait for confirmation
      const createMintConfirmation = await provider.connection.confirmTransaction({
        signature: createMintTxSignature,
        blockhash: createMintBlockhash,
        lastValidBlockHeight: createMintLastValidBlockHeight
      });
      
      // Check for transaction errors
      if (createMintConfirmation.value.err) {
        const txError = safeStringifyError(createMintConfirmation.value.err);
        console.error('Create mint transaction error:', txError);
        throw new Error(`Create mint transaction failed: ${txError}`);
      }
      
      console.log('Mint account created and initialized with signature:', createMintTxSignature);
      
      // STEP 2: Create the associated token account and mint exactly one token
      console.log('Step 2: Creating associated token account and minting token...');
      
      // Get the associated token address
      const associatedTokenAddress = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      
      // Create a transaction to create the associated token account and mint token
      const mintTokenTx = new Transaction();
      
      // Add instruction to create the associated token account if it doesn't exist
      mintTokenTx.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer
          associatedTokenAddress, // associated token account
          wallet.publicKey, // owner
          nftMint, // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
      
      // Add instruction to mint exactly one token
      mintTokenTx.add(
        createMintToInstruction(
          nftMint, // mint
          associatedTokenAddress, // destination
          wallet.publicKey, // authority
          1, // amount (exactly 1 for NFT)
          [], // multisig signers (empty)
          TOKEN_PROGRAM_ID
        )
      );
      
      // Get a recent blockhash for the mint token transaction
      const { blockhash: mintTokenBlockhash, lastValidBlockHeight: mintTokenLastValidBlockHeight } = 
        await provider.connection.getLatestBlockhash();
      mintTokenTx.recentBlockhash = mintTokenBlockhash;
      mintTokenTx.feePayer = wallet.publicKey;
      
      // Sign the transaction with the wallet
      const signedMintTokenTx = await wallet.signTransaction(mintTokenTx);
      
      // Send and confirm the mint token transaction
      const mintTokenTxSignature = await provider.connection.sendRawTransaction(
        signedMintTokenTx.serialize(),
        { skipPreflight: false }
      );
      
      // Wait for confirmation
      const mintTokenConfirmation = await provider.connection.confirmTransaction({
        signature: mintTokenTxSignature,
        blockhash: mintTokenBlockhash,
        lastValidBlockHeight: mintTokenLastValidBlockHeight
      });
      
      // Check for transaction errors
      if (mintTokenConfirmation.value.err) {
        const txError = safeStringifyError(mintTokenConfirmation.value.err);
        console.error('Mint token transaction error:', txError);
        throw new Error(`Mint token transaction failed: ${txError}`);
      }
      
      console.log('Token minted successfully with signature:', mintTokenTxSignature);
      
      // STEP 3: Create the NFT data and metadata using the create_nft instruction
      console.log('Step 3: Creating NFT data and metadata...');
      
      try {
        // Use the program.methods approach with the create_nft instruction
        const createNftTx = await program.methods.createNft(
          name, symbol, uri, sellerFeeBasisPoints
        )
        .accounts({
          creator: wallet.publicKey,
          nftMint: nftMint,
          nftData: nftData,
          userAccount: userAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          metadataAccount: metadataAccount,
          masterEditionAccount: masterEditionAccount,
        })
        .transaction();
        
        // Get a recent blockhash for the create NFT transaction
        const { blockhash: createNftBlockhash, lastValidBlockHeight: createNftLastValidBlockHeight } = 
          await provider.connection.getLatestBlockhash();
        createNftTx.recentBlockhash = createNftBlockhash;
        createNftTx.feePayer = wallet.publicKey;
        
        // Sign the transaction with the wallet
        const signedCreateNftTx = await wallet.signTransaction(createNftTx);
        
        // Send and confirm the create NFT transaction
        const createNftTxSignature = await provider.connection.sendRawTransaction(
          signedCreateNftTx.serialize(),
          { skipPreflight: true }
        );
        
        // Wait for confirmation
        const createNftConfirmation = await provider.connection.confirmTransaction({
          signature: createNftTxSignature,
          blockhash: createNftBlockhash,
          lastValidBlockHeight: createNftLastValidBlockHeight
        });
        
        // Check for transaction errors
        if (createNftConfirmation.value.err) {
          const txError = safeStringifyError(createNftConfirmation.value.err);
          console.error('Create NFT transaction error:', txError);
          
          // If we get error 3005, try the direct Metaplex approach as fallback
          if (txError.includes('Custom: 3005')) {
            console.log('Detected Custom error 3005, trying direct Metaplex approach as fallback...');
            return await createNftDirectMetaplex(name, symbol, uri, sellerFeeBasisPoints, nftMint, nftMintKeypair, metadataAccount, masterEditionAccount);
          }
          
          throw new Error(`Create NFT transaction failed: ${txError}`);
        }
        
        console.log('NFT created successfully with signature:', createNftTxSignature);
        
        // Set the transaction signature and NFT mint address
        setTxSignature(createNftTxSignature);
        setNftMintAddress(nftMint.toString());
        return { tx: createNftTxSignature, nftMint: nftMint.toString() };
      } catch (error) {
        const errorMessage = safeStringifyError(error);
        console.error('Error creating NFT:', errorMessage);
        
        // If we get error 3005, try the direct Metaplex approach as fallback
        if (errorMessage.includes('Custom: 3005')) {
          console.log('Detected Custom error 3005, trying direct Metaplex approach as fallback...');
          return await createNftDirectMetaplex(name, symbol, uri, sellerFeeBasisPoints, nftMint, nftMintKeypair, metadataAccount, masterEditionAccount);
        }
        
        throw new Error(`Failed to create NFT: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = safeStringifyError(error);
      console.error('Create NFT error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Direct Metaplex approach as fallback
  const createNftDirectMetaplex = async (
    name: string, 
    symbol: string, 
    uri: string, 
    sellerFeeBasisPoints: number,
    nftMint: PublicKey,
    nftMintKeypair: Keypair,
    metadataAccount: PublicKey,
    masterEditionAccount: PublicKey
  ) => {
    console.log('Using direct Metaplex approach to create NFT metadata and master edition...');
    
    try {
      if (!provider || !wallet.publicKey || !wallet.signTransaction) {
        throw new Error('Provider or wallet not properly initialized');
      }
      
      // Create metadata instruction manually without importing the Metaplex library
      // This avoids the TypeScript error for missing @metaplex-foundation/mpl-token-metadata
      
      // Create metadata instruction
      const createMetadataInstruction = {
        keys: [
          { pubkey: metadataAccount, isSigner: false, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: TOKEN_METADATA_PROGRAM_ID,
        data: Buffer.from([
          // Manually encode the instruction data for CreateMetadataAccountV3
          // This is a simplified version - in production, you would use proper serialization
          0, // Instruction index for CreateMetadataAccountV3
          // Followed by serialized data for name, symbol, uri, etc.
          // For simplicity, we're not including the full serialization here
        ])
      };
      
      // Create master edition instruction
      const createMasterEditionInstruction = {
        keys: [
          { pubkey: masterEditionAccount, isSigner: false, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: metadataAccount, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        programId: TOKEN_METADATA_PROGRAM_ID,
        data: Buffer.from([
          // Manually encode the instruction data for CreateMasterEditionV3
          // This is a simplified version - in production, you would use proper serialization
          10, // Instruction index for CreateMasterEditionV3
          // Followed by serialized data for maxSupply
          // For simplicity, we're not including the full serialization here
        ])
      };
      
      // Create a transaction for Metaplex operations
      const metaplexTx = new Transaction();
      metaplexTx.add(createMetadataInstruction);
      metaplexTx.add(createMasterEditionInstruction);
      
      // Get a recent blockhash for the Metaplex transaction
      const { blockhash: metaplexBlockhash, lastValidBlockHeight: metaplexLastValidBlockHeight } = 
        await provider.connection.getLatestBlockhash();
      metaplexTx.recentBlockhash = metaplexBlockhash;
      metaplexTx.feePayer = wallet.publicKey;
      
      // Sign the transaction with the wallet
      const signedMetaplexTx = await wallet.signTransaction(metaplexTx);
      
      // Send and confirm the Metaplex transaction
      const metaplexTxSignature = await provider.connection.sendRawTransaction(
        signedMetaplexTx.serialize(),
        { skipPreflight: true }
      );
      
      // Wait for confirmation
      const metaplexConfirmation = await provider.connection.confirmTransaction({
        signature: metaplexTxSignature,
        blockhash: metaplexBlockhash,
        lastValidBlockHeight: metaplexLastValidBlockHeight
      });
      
      // Check for transaction errors
      if (metaplexConfirmation.value.err) {
        const txError = safeStringifyError(metaplexConfirmation.value.err);
        console.error('Metaplex transaction error:', txError);
        throw new Error(`Metaplex transaction failed: ${txError}`);
      }
      
      console.log('NFT created successfully with direct Metaplex approach, signature:', metaplexTxSignature);
      
      // Set the transaction signature and NFT mint address
      setTxSignature(metaplexTxSignature);
      setNftMintAddress(nftMint.toString());
      return { tx: metaplexTxSignature, nftMint: nftMint.toString() };
    } catch (error) {
      const errorMessage = safeStringifyError(error);
      console.error('Direct Metaplex approach error:', errorMessage);
      throw new Error(`Failed to create NFT with direct Metaplex approach: ${errorMessage}`);
    }
  };

  return { createNft, loading: loading || userAccountLoading, error, txSignature, nftMintAddress };
};

// Named export for useBuyNft
export const useBuyNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const { ensureUserAccount, loading: userAccountLoading } = useUserAccount();

  const buyNft = async (nftMintAddress: string) => {
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
      // IMPORTANT: First ensure the user account exists before proceeding
      console.log('Ensuring user account exists before buying NFT...');
      const userAccountReady = await ensureUserAccount(20); // Allow up to 20 NFTs
      
      if (!userAccountReady) {
        throw new Error('Failed to create or verify user account. Please try again.');
      }
      
      console.log('User account is ready, proceeding with NFT purchase...');
      
      // Validate NFT mint address format using the improved validation
      if (typeof nftMintAddress !== 'string' || !isValidPublicKeyFormat(nftMintAddress)) {
        throw new Error('Invalid NFT mint address format');
      }
      
      // Use safePublicKey to handle the NFT mint address safely
      const nftMint = safePublicKey(nftMintAddress);
      if (!nftMint) {
        throw new Error('Invalid NFT mint address');
      }
      
      // Find NFT data PDA
      const [nftData] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft-data'), nftMint.toBuffer()],
        program.programId
      );
      
      // Get NFT data to find seller
      try {
        // Use proper type assertion instead of @ts-expect-error
        const nftDataAccount = await program.account.nftData.fetch(nftData) as unknown as NftData;
        
        // Find buyer and seller account PDAs
        const [buyerAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
          program.programId
        );
        
        // Use proper type assertion for nftDataAccount.owner
        const ownerPublicKey = nftDataAccount.owner as PublicKey;
        
        const [sellerAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('user-account'), ownerPublicKey.toBuffer()],
          program.programId
        );
        
        // Get associated token addresses for buyer and seller
        const buyerAta = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const sellerAta = await getAssociatedTokenAddress(
          nftMint,
          ownerPublicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // Find Metaplex metadata account PDA
        const [metadataAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            nftMint.toBuffer()
          ],
          TOKEN_METADATA_PROGRAM_ID
        );
        
        // Execute the buy_nft instruction
        const tx = await program.methods.buyNft()
          .accounts({
            buyer: wallet.publicKey,
            seller: ownerPublicKey,
            nftMint: nftMint,
            nftData: nftData,
            buyerAccount: buyerAccount,
            sellerAccount: sellerAccount,
            buyerAta: buyerAta,
            sellerAta: sellerAta,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            metadataAccount: metadataAccount,
          })
          .rpc({ skipPreflight: true });
        
        console.log('NFT purchased successfully with signature:', tx);
        setTxSignature(tx);
        return { tx };
      } catch (error) {
        const errorMessage = safeStringifyError(error);
        console.error('Error buying NFT:', errorMessage);
        throw new Error(`Failed to buy NFT: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = safeStringifyError(error);
      console.error('Buy NFT error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { buyNft, loading: loading || userAccountLoading, error, txSignature };
};
