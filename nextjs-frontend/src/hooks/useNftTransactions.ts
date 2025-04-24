'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  Transaction,
  TransactionInstruction,
  AccountInfo
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction
} from '@solana/spl-token';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';
import * as anchor from '@project-serum/anchor';
import { useUserAccount } from '@/hooks/useUserAccount';

// Define interfaces for the account data structures
interface NftData {
  owner: PublicKey;
  // Add other fields as needed
}

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

  // Helper function to check if an account exists
  const accountExists = async (pubkey: PublicKey): Promise<boolean> => {
    try {
      if (!provider) {
        console.error('Provider is null');
        return false;
      }
      const accountInfo = await provider.connection.getAccountInfo(pubkey);
      return accountInfo !== null;
    } catch (err) {
      console.error('Error checking if account exists:', err);
      return false;
    }
  };

  const createNft = async (name: string, symbol: string, uri: string, sellerFeeBasisPoints: number) => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
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
      
      // Get the associated token address for the NFT
      const associatedTokenAddress = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      console.log('Associated token address:', associatedTokenAddress.toString());
      
      // Step 1: Create NFT data and metadata (without master edition)
      console.log('Step 1: Creating NFT data and metadata...');
      
      // Create a transaction instruction manually with all required accounts
      const createNftDataTx = new Transaction({ feePayer: wallet.publicKey });
      
      // Add the instruction to create the NFT data and metadata
      createNftDataTx.add(
        new TransactionInstruction({
          programId: program.programId,
          keys: [
            // Accounts from the CreateNFTData struct in create_nft_data.rs
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // creator
            { pubkey: nftMint, isSigner: true, isWritable: true }, // nft_mint - IMPORTANT: isSigner must be true
            { pubkey: nftData, isSigner: false, isWritable: true }, // nft_data
            { pubkey: userAccount, isSigner: false, isWritable: true }, // user_account
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
            { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // token_metadata_program
            { pubkey: metadataAccount, isSigner: false, isWritable: true }, // metadata_account
          ],
          data: program.coder.instruction.encode('create_nft_data', {
            name,
            symbol,
            uri,
            seller_fee_basis_points: sellerFeeBasisPoints
          })
        })
      );
      
      // Get a fresh blockhash
      const createNftDataBh = await provider.connection.getLatestBlockhash('confirmed');
      createNftDataTx.recentBlockhash = createNftDataBh.blockhash;
      
      // Check if wallet adapter supports signing
      if (!wallet.signTransaction) {
        throw new Error('Wallet does not support transaction signing');
      }
      
      // First sign with the mint keypair
      createNftDataTx.sign(nftMintKeypair);
      
      // Then sign with the wallet
      const signedCreateNftDataTx = await wallet.signTransaction(createNftDataTx);
      
      // Send and confirm transaction
      const createNftDataSignature = await provider.connection.sendRawTransaction(
        signedCreateNftDataTx.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );
      
      // Wait for confirmation
      await provider.connection.confirmTransaction({
        signature: createNftDataSignature,
        blockhash: createNftDataBh.blockhash,
        lastValidBlockHeight: createNftDataBh.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('NFT data and metadata created successfully with signature:', createNftDataSignature);
      
      // Step 2: Create associated token account and mint exactly one token
      console.log('Step 2: Creating associated token account and minting one token...');
      const mintTokenTx = new Transaction({ feePayer: wallet.publicKey });
      
      // Check if the associated token account exists
      const tokenAccountExists = await accountExists(associatedTokenAddress);
      
      // If the associated token account doesn't exist, create it
      if (!tokenAccountExists) {
        console.log('Associated token account does not exist, creating it...');
        mintTokenTx.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey, // payer
            associatedTokenAddress, // associated token account
            wallet.publicKey, // owner
            nftMint, // mint
            TOKEN_PROGRAM_ID
          )
        );
      } else {
        console.log('Associated token account already exists');
      }
      
      // Add instruction to mint one token to the associated token account
      mintTokenTx.add(
        createMintToInstruction(
          nftMint, // mint
          associatedTokenAddress, // destination
          wallet.publicKey, // authority
          1, // amount (1 for NFT)
          [], // multisig signers
          TOKEN_PROGRAM_ID
        )
      );
      
      // Get a fresh blockhash
      const mintTokenBh = await provider.connection.getLatestBlockhash('confirmed');
      mintTokenTx.recentBlockhash = mintTokenBh.blockhash;
      
      // Sign with wallet
      const signedMintTokenTx = await wallet.signTransaction(mintTokenTx);
      
      // Send and confirm transaction
      const mintTokenSignature = await provider.connection.sendRawTransaction(
        signedMintTokenTx.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );
      
      // Wait for confirmation
      await provider.connection.confirmTransaction({
        signature: mintTokenSignature,
        blockhash: mintTokenBh.blockhash,
        lastValidBlockHeight: mintTokenBh.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Token minted successfully with signature:', mintTokenSignature);
      
      // Step 3: Create master edition
      console.log('Step 3: Creating master edition...');
      const createMasterEditionTx = new Transaction({ feePayer: wallet.publicKey });
      
      // Add the instruction to create the master edition
      createMasterEditionTx.add(
        new TransactionInstruction({
          programId: program.programId,
          keys: [
            // Accounts required for master edition creation
            { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // creator
            { pubkey: nftMint, isSigner: false, isWritable: true }, // nft_mint
            { pubkey: nftData, isSigner: false, isWritable: true }, // nft_data
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
            { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // token_metadata_program
            { pubkey: metadataAccount, isSigner: false, isWritable: true }, // metadata_account
            { pubkey: masterEditionAccount, isSigner: false, isWritable: true }, // master_edition_account
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: false }, // token_account
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
          ],
          data: program.coder.instruction.encode('create_master_edition', {})
        })
      );
      
      // Get a fresh blockhash
      const createMasterEditionBh = await provider.connection.getLatestBlockhash('confirmed');
      createMasterEditionTx.recentBlockhash = createMasterEditionBh.blockhash;
      
      // Sign with wallet
      const signedCreateMasterEditionTx = await wallet.signTransaction(createMasterEditionTx);
      
      // Send and confirm transaction
      const createMasterEditionSignature = await provider.connection.sendRawTransaction(
        signedCreateMasterEditionTx.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );
      
      // Wait for confirmation
      await provider.connection.confirmTransaction({
        signature: createMasterEditionSignature,
        blockhash: createMasterEditionBh.blockhash,
        lastValidBlockHeight: createMasterEditionBh.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Master edition created successfully with signature:', createMasterEditionSignature);
      
      setTxSignature(createMasterEditionSignature);
      setNftMintAddress(nftMint.toString());
      return { tx: createMasterEditionSignature, nftMint: nftMint.toString() };
    } catch (err) {
      console.error('Create NFT error:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
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

  // Helper function to check if an account exists
  const accountExists = async (pubkey: PublicKey): Promise<boolean> => {
    try {
      if (!provider) {
        console.error('Provider is null');
        return false;
      }
      const accountInfo = await provider.connection.getAccountInfo(pubkey);
      return accountInfo !== null;
    } catch (err) {
      console.error('Error checking if account exists:', err);
      return false;
    }
  };

  const buyNft = async (nftMintAddress: string) => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
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
        
        // Get the associated token addresses for buyer and seller
        const buyerTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey,
          false,
          TOKEN_PROGRAM_ID
        );
        
        const sellerTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          ownerPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );
        
        // Check if the buyer token account exists
        const buyerTokenAccountExists = await accountExists(buyerTokenAccount);
        
        // Create a transaction
        const transaction = new Transaction({ feePayer: wallet.publicKey });
        
        // If the buyer token account doesn't exist, create it
        if (!buyerTokenAccountExists) {
          console.log('Buyer token account does not exist, creating it...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey, // payer
              buyerTokenAccount, // associated token account
              wallet.publicKey, // owner
              nftMint, // mint
              TOKEN_PROGRAM_ID
            )
          );
        }
        
        // Add the buy NFT instruction
        transaction.add(
          program.instruction.buyNft({
            accounts: {
              buyer: wallet.publicKey,
              buyerAccount,
              sellerAccount,
              nftData,
              nftMint,
              sellerNftTokenAccount: sellerTokenAccount,
              buyerNftTokenAccount: buyerTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            },
          })
        );
        
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        
        // Check if wallet adapter supports signing
        if (!wallet.signTransaction) {
          throw new Error('Wallet does not support transaction signing');
        }
        
        // Sign with wallet
        const signedTransaction = await wallet.signTransaction(transaction);
        
        // Send and confirm transaction
        const signature = await provider.connection.sendRawTransaction(
          signedTransaction.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
        
        // Wait for confirmation
        await provider.connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        console.log('NFT purchased successfully with signature:', signature);
        
        setTxSignature(signature);
        return { tx: signature };
      } catch (err) {
        console.error('Error fetching NFT data:', err);
        throw new Error('Failed to fetch NFT data. The NFT may not exist or is not available for purchase.');
      }
    } catch (err) {
      console.error('Buy NFT error:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { buyNft, loading: loading || userAccountLoading, error, txSignature };
};

// Default export for the entire hook
export default function useNftTransactions() {
  const createNftHook = useCreateNft();
  const buyNftHook = useBuyNft();
  
  return {
    ...createNftHook,
    ...buyNftHook,
  };
}
