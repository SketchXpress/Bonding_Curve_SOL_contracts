'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

// Import SPL Token functions using require to avoid TypeScript issues
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } = require('@solana/spl-token');
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';

// Import anchor with require to avoid TypeScript issues
const anchor = require('@coral-xyz/anchor');

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
  const [escrowAddress, setEscrowAddress] = useState<string | null>(null);

  const mintNft = async (
    poolAddress: string,
    name: string, 
    symbol: string, 
    uri: string
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
      if (!poolAddress || !name || !symbol || !uri) {
        throw new Error('Pool address, name, symbol, and URI are required');
      }
      
      // Validate pool address
      if (!isValidPublicKeyFormat(poolAddress)) {
        throw new Error('Invalid pool address format');
      }
      
      const pool = safePublicKey(poolAddress);
      if (!pool) {
        throw new Error('Invalid pool address');
      }
      
      console.log('Using pool address:', pool.toString());
      
      // Add debugging for program context
      console.log('Program ID from context:', program.programId?.toString());
      console.log('Connection endpoint:', program.provider.connection.rpcEndpoint);
      
      // Check if the pool account exists before trying to fetch it
      console.log('Checking if pool account exists...');
      const poolAccountInfo = await program.provider.connection.getAccountInfo(pool);
      console.log('Pool account info:', poolAccountInfo);
      
      if (!poolAccountInfo) {
        throw new Error(`Pool account does not exist at address ${pool.toString()}. Please ensure the pool was created successfully and you're using the correct network.`);
      }
      
      // Get pool data to retrieve collection mint
      const poolData = await program.account.bondingCurvePool.fetch(pool);
      
      console.log('Raw pool data:', poolData);
      console.log('Pool data structure:', {
        collection: poolData.collection?.toString(),
        config: poolData.config,
        state: poolData.state,
        stats: poolData.stats
      });
      
      const collectionMint = poolData.collection as PublicKey;
      
      // Generate a new keypair for the NFT mint
      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;
      const creator = (poolData.config as any).creator as PublicKey;

      console.log('Generated NFT mint keypair:', nftMintKeypair.publicKey.toString());
      
      // Find NFT escrow PDA
      const [escrow] = PublicKey.findProgramAddressSync(
        [Buffer.from('escrow'), nftMint.toBuffer()],
        program.programId
      );
      
      // Find minter tracker PDA
      const [minterTracker] = PublicKey.findProgramAddressSync(
        [Buffer.from('minter'), nftMint.toBuffer()],
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
      
      // Get the associated token address for the NFT (minter token account)
      const minterTokenAccount = await getAssociatedTokenAddress(
        nftMint,
        wallet.publicKey
      );
      
      // Calculate the current price from the pool
      console.log('Accessing pool config and state...');
      console.log('poolData.config:', poolData.config);
      console.log('poolData.state:', poolData.state);
      
      const basePrice = (poolData.config as any)?.basePrice as any;
      const growthFactor = (poolData.config as any)?.growthFactor as any;
      const currentSupply = (poolData.state as any)?.currentSupply as any;
      const poolCreator = (poolData.config as any)?.creator as PublicKey;
      
      console.log('Extracted values:', {
        basePrice: basePrice?.toString(),
        growthFactor: growthFactor?.toString(),
        currentSupply: currentSupply?.toString(),
        creator: poolCreator?.toString()
      });
      
      // Add safety checks for undefined values
      if (!basePrice || !growthFactor || currentSupply === undefined || currentSupply === null) {
        console.error('Missing pool data:', {
          hasBasePrice: !!basePrice,
          hasGrowthFactor: !!growthFactor,
          hasCurrentSupply: currentSupply !== undefined && currentSupply !== null,
          basePrice: basePrice?.toString(),
          growthFactor: growthFactor?.toString(), 
          currentSupply: currentSupply?.toString()
        });
        throw new Error('Pool data is incomplete or malformed');
      }
      
      // Simple price calculation (actual calculation happens on-chain)
      // price = basePrice * (growthFactor/1_000_000)^currentSupply
      console.log('Type checking before toNumber calls:', {
        basePrice: typeof basePrice,
        basePriceConstructor: basePrice?.constructor?.name,
        basePriceToString: basePrice?.toString(),
        growthFactor: typeof growthFactor,
        growthFactorConstructor: growthFactor?.constructor?.name,
        growthFactorToString: growthFactor?.toString(),
        currentSupply: typeof currentSupply,
        currentSupplyConstructor: currentSupply?.constructor?.name,
        currentSupplyToString: currentSupply?.toString()
      });
      
      // Ensure we have BN objects before calling toNumber()
      const basePriceBN = new anchor.BN(basePrice.toString());
      const growthFactorBN = new anchor.BN(growthFactor.toString());
      const currentSupplyBN = new anchor.BN(currentSupply.toString());
      
      const growthFactorDecimal = growthFactorBN.toNumber() / 1_000_000;
      const estimatedPrice = basePriceBN.toNumber() * Math.pow(growthFactorDecimal, currentSupplyBN.toNumber());
      
      console.log(`Estimated price for minting NFT: ${estimatedPrice / 1_000_000_000} SOL`);
      
      // --- ADD COMPUTE UNIT LIMIT INSTRUCTION --- 
      const computeUnitLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({ 
        units: 400000 // Request 400,000 CUs (adjust if needed)
      });
      // --- END ADD COMPUTE UNIT LIMIT INSTRUCTION ---
      
      console.log('Creator:', creator.toString());
      console.log('Collection Mint:', collectionMint.toString());
      // Log other relevant accounts
      
      console.log('About to call mintNft with accounts:', {
        minter: wallet.publicKey.toString(),
        bondingCurvePool: pool.toString(),
        nftMint: nftMint.toString(),
        minterTokenAccount: minterTokenAccount.toString(),
        nftEscrow: escrow.toString(),
        minterTracker: minterTracker.toString(),
        metadata: metadataAccount.toString()
      });

      // Execute the transaction to mint the NFT with proper args structure
      const tx = await program.methods
        .mintNft({
          name: name,
          symbol: symbol,
          uri: uri
        })
        .accounts({
          minter: wallet.publicKey,
          bondingCurvePool: pool,
          nftMint: nftMint,
          minterTokenAccount: minterTokenAccount,
          nftEscrow: escrow,
          minterTracker: minterTracker,
          metadata: metadataAccount,
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
      
      // Set the transaction signature, NFT mint address, and escrow address
      setTxSignature(tx);
      setNftMintAddress(nftMint.toString());
      setEscrowAddress(escrow.toString());
      
      return { 
        tx, 
        nftMint: nftMint.toString(),
        escrow: escrow.toString()
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

  return { mintNft, loading, error, txSignature, nftMintAddress, escrowAddress };
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
      const poolData = await program.account.bondingCurvePool.fetch(pool);
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
