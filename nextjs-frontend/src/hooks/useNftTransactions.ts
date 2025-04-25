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
  AccountInfo,
  AccountMeta
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';
import * as anchor from '@coral-xyz/anchor'; // Using @coral-xyz/anchor instead of @project-serum/anchor
import { useUserAccount } from './useUserAccount'; // Import useUserAccount hook

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

  // Helper function to check if an account exists
  const accountExists = async (pubkey: PublicKey): Promise<boolean> => {
    try {
      if (!provider) {
        console.error('Provider is null');
        return false;
      }
      const accountInfo = await provider.connection.getAccountInfo(pubkey);
      return accountInfo !== null;
    } catch (error) {
      console.error('Error checking if account exists:', safeStringifyError(error));
      return false;
    }
  };

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
      
      // Get the associated token address for the NFT
      const associatedTokenAddress = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );
      
      console.log('Associated token address:', associatedTokenAddress.toString());
      
      // ALTERNATIVE APPROACH: Token-minting first using existing instructions
      
      // Step 1: Create mint account and initialize it
      console.log('Step 1: Creating and initializing mint account...');
      const createMintTx = new Transaction({ feePayer: wallet.publicKey });
      
      // Get minimum balance for rent exemption
      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
      
      // Add instruction to create account for mint
      createMintTx.add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: nftMint,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        })
      );
      
      // Add instruction to initialize mint
      createMintTx.add(
        createInitializeMintInstruction(
          nftMint, // mint pubkey
          0, // decimals
          wallet.publicKey, // mint authority
          wallet.publicKey, // freeze authority (optional)
          TOKEN_PROGRAM_ID
        )
      );
      
      // Get a fresh blockhash
      const createMintBh = await provider.connection.getLatestBlockhash('confirmed');
      createMintTx.recentBlockhash = createMintBh.blockhash;
      
      // First sign with the mint keypair
      createMintTx.sign(nftMintKeypair);
      
      // Then sign with the wallet
      const signedCreateMintTx = await wallet.signTransaction(createMintTx);
      
      // Send and confirm transaction
      const createMintSignature = await provider.connection.sendRawTransaction(
        signedCreateMintTx.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );
      
      // Wait for confirmation
      await provider.connection.confirmTransaction({
        signature: createMintSignature,
        blockhash: createMintBh.blockhash,
        lastValidBlockHeight: createMintBh.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Mint account created and initialized with signature:', createMintSignature);
      
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
      
      // Step 3: Create NFT data and metadata using the existing create_nft instruction
      console.log('Step 3: Creating NFT data and metadata...');
      
      // Create a transaction
      const createNftTx = new Transaction({ feePayer: wallet.publicKey });
      
      try {
        // Log all accounts we're going to pass to help with debugging
        console.log('Preparing accounts for createNft instruction:');
        console.log(`Creator: ${wallet.publicKey.toString()}`);
        console.log(`NFT Mint: ${nftMint.toString()}`);
        console.log(`NFT Data: ${nftData.toString()}`);
        console.log(`User Account: ${userAccount.toString()}`);
        console.log(`System Program: ${SystemProgram.programId.toString()}`);
        console.log(`Token Program: ${TOKEN_PROGRAM_ID.toString()}`);
        console.log(`Rent: ${SYSVAR_RENT_PUBKEY.toString()}`);
        console.log(`Token Metadata Program: ${TOKEN_METADATA_PROGRAM_ID.toString()}`);
        console.log(`Metadata Account: ${metadataAccount.toString()}`);
        console.log(`Master Edition Account: ${masterEditionAccount.toString()}`);
        
        // Create the instruction manually to ensure all accounts are included
        const accounts: AccountMeta[] = [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: false, isWritable: true },
          { pubkey: nftData, isSigner: false, isWritable: true },
          { pubkey: userAccount, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: metadataAccount, isSigner: false, isWritable: true },
          { pubkey: masterEditionAccount, isSigner: false, isWritable: true },
        ];
        
        // Get the instruction using program.methods
        const ix = await program.methods.createNft(
          name,
          symbol,
          uri,
          sellerFeeBasisPoints
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
        .instruction();
        
        // Log all accounts we're passing to help with debugging
        console.log('Passing the following accounts to createNft instruction:');
        ix.keys.forEach((meta, index) => {
          console.log(`${index}: ${meta.pubkey.toString()} (writable: ${meta.isWritable}, signer: ${meta.isSigner})`);
        });
        
        // Verify that all required accounts are included
        if (ix.keys.length < 10) {
          console.warn(`Warning: Expected at least 10 accounts, but only ${ix.keys.length} are included in the instruction`);
          
          // Check which accounts might be missing
          const accountsInIx = new Set(ix.keys.map(meta => meta.pubkey.toString()));
          const requiredAccounts = [
            { name: 'Creator', pubkey: wallet.publicKey.toString() },
            { name: 'NFT Mint', pubkey: nftMint.toString() },
            { name: 'NFT Data', pubkey: nftData.toString() },
            { name: 'User Account', pubkey: userAccount.toString() },
            { name: 'System Program', pubkey: SystemProgram.programId.toString() },
            { name: 'Token Program', pubkey: TOKEN_PROGRAM_ID.toString() },
            { name: 'Rent', pubkey: SYSVAR_RENT_PUBKEY.toString() },
            { name: 'Token Metadata Program', pubkey: TOKEN_METADATA_PROGRAM_ID.toString() },
            { name: 'Metadata Account', pubkey: metadataAccount.toString() },
            { name: 'Master Edition Account', pubkey: masterEditionAccount.toString() },
          ];
          
          const missingAccounts = requiredAccounts.filter(acc => !accountsInIx.has(acc.pubkey));
          if (missingAccounts.length > 0) {
            console.warn('Missing accounts:', missingAccounts.map(acc => acc.name).join(', '));
            
            // Use our manually created account list instead
            console.log('Using manually created account list to ensure all accounts are included');
            
            // Create instruction data manually
            const data = program.coder.instruction.encode('create_nft', {
              name,
              symbol,
              uri,
              sellerFeeBasisPoints,
            });
            
            // Create instruction manually
            const manualIx = new TransactionInstruction({
              keys: accounts,
              programId: program.programId,
              data,
            });
            
            createNftTx.add(manualIx);
          } else {
            createNftTx.add(ix);
          }
        } else {
          createNftTx.add(ix);
        }
      } catch (error) {
        const errorMessage = safeStringifyError(error);
        console.error('Error creating instruction:', errorMessage);
        throw new Error(`Failed to create instruction: ${errorMessage}`);
      }
      
      // Get a fresh blockhash
      const createNftBh = await provider.connection.getLatestBlockhash('confirmed');
      createNftTx.recentBlockhash = createNftBh.blockhash;
      
      // Sign with wallet
      const signedCreateNftTx = await wallet.signTransaction(createNftTx);
      
      // Send and confirm transaction with preflight disabled to get more detailed error messages
      const createNftSignature = await provider.connection.sendRawTransaction(
        signedCreateNftTx.serialize(),
        { 
          skipPreflight: true, // Disable preflight to get more detailed error messages
          preflightCommitment: 'confirmed' 
        }
      );
      
      // Wait for confirmation
      const confirmationResult = await provider.connection.confirmTransaction({
        signature: createNftSignature,
        blockhash: createNftBh.blockhash,
        lastValidBlockHeight: createNftBh.lastValidBlockHeight
      }, 'confirmed');
      
      // Check for transaction errors
      if (confirmationResult.value.err) {
        const txError = safeStringifyError(confirmationResult.value.err);
        console.error('Transaction error:', txError);
        throw new Error(`Transaction failed: ${txError}`);
      }
      
      console.log('NFT created successfully with signature:', createNftSignature);
      
      setTxSignature(createNftSignature);
      setNftMintAddress(nftMint.toString());
      return { tx: createNftSignature, nftMint: nftMint.toString() };
    } catch (error) {
      const errorMessage = safeStringifyError(error);
      console.error('Create NFT error:', errorMessage);
      setError(errorMessage);
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
    } catch (error) {
      console.error('Error checking if account exists:', safeStringifyError(error));
      return false;
    }
  };

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
        
        // Check if buyer token account exists, if not create it
        const buyerTokenAccountExists = await accountExists(buyerTokenAccount);
        
        // Create transaction
        const tx = new Transaction();
        
        // If buyer token account doesn't exist, add instruction to create it
        if (!buyerTokenAccountExists) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              buyerTokenAccount,
              wallet.publicKey,
              nftMint,
              TOKEN_PROGRAM_ID
            )
          );
        }
        
        // Add buy NFT instruction
        tx.add(
          await program.methods.buyNft()
            .accounts({
              buyer: wallet.publicKey,
              seller: ownerPublicKey,
              nftMint: nftMint,
              nftData: nftData,
              buyerAccount: buyerAccount,
              sellerAccount: sellerAccount,
              buyerTokenAccount: buyerTokenAccount,
              sellerTokenAccount: sellerTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .instruction()
        );
        
        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = wallet.publicKey;
        
        // Sign transaction
        const signedTx = await wallet.signTransaction(tx);
        
        // Send transaction
        const signature = await provider.connection.sendRawTransaction(signedTx.serialize());
        
        // Confirm transaction
        await provider.connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        });
        
        console.log('NFT purchased successfully with signature:', signature);
        
        setTxSignature(signature);
        return { tx: signature };
      } catch (error) {
        const errorMessage = safeStringifyError(error);
        console.error('Error fetching NFT data:', errorMessage);
        throw new Error(`Failed to fetch NFT data: ${errorMessage}`);
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

// Default export for the combined hook
export const useNftTransactions = () => {
  const { createNft, loading: createLoading, error: createError, txSignature: createTxSignature, nftMintAddress } = useCreateNft();
  const { buyNft, loading: buyLoading, error: buyError, txSignature: buyTxSignature } = useBuyNft();
  
  return {
    createNft,
    buyNft,
    loading: createLoading || buyLoading,
    error: createError || buyError,
    createTxSignature,
    buyTxSignature,
    nftMintAddress
  };
};

export default useNftTransactions;
