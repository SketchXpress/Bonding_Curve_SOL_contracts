'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createInitializeMintInstruction, MINT_SIZE, getMinimumBalanceForRentExemptMint, createMintToInstruction } from '@solana/spl-token';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';
import * as anchor from '@project-serum/anchor';

// Define interfaces for the account data structures
interface NftData {
  owner: PublicKey;
  // Add other fields as needed
}

// Named export for useCreateNft
export const useCreateNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string | null>(null);

  const createNft = async (name: string, symbol: string, uri: string, sellerFeeBasisPoints: number) => {
    if (!program || !wallet.publicKey || !provider || !wallet.signTransaction) {
      setError('Program not initialized, wallet not connected, or signTransaction not available');
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
      
      console.log('Creating NFT with accounts:', {
        creator: wallet.publicKey.toString(),
        nftMint: nftMint.toString(),
        nftData: nftData.toString(),
        userAccount: userAccount.toString(),
        systemProgram: SystemProgram.programId.toString(),
        tokenProgram: TOKEN_PROGRAM_ID.toString(),
        rent: SYSVAR_RENT_PUBKEY.toString()
      });
      
      // APPROACH 1: Create the mint account first in a separate transaction
      // This ensures the mint account exists before we try to use it in the NFT creation
      try {
        // Calculate rent for mint
        const lamports = await getMinimumBalanceForRentExemptMint(provider.connection);
        
        // Create a transaction to initialize the mint
        const createMintTx = new Transaction();
        
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
            nftMint,
            0, // decimals
            wallet.publicKey, // mint authority
            wallet.publicKey, // freeze authority (optional)
            TOKEN_PROGRAM_ID
          )
        );
        
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        createMintTx.recentBlockhash = blockhash;
        createMintTx.feePayer = wallet.publicKey;
        
        // Sign with both the wallet and the mint keypair
        createMintTx.sign(nftMintKeypair);
        
        // Have the wallet sign the transaction
        const signedMintTx = await wallet.signTransaction(createMintTx);
        
        // Send the transaction
        const mintTxId = await provider.connection.sendRawTransaction(signedMintTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });
        
        console.log('Mint account created with transaction:', mintTxId);
        
        // Wait for confirmation
        await provider.connection.confirmTransaction({
          signature: mintTxId,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        console.log('Mint account creation confirmed');
      } catch (mintErr) {
        console.error('Error creating mint account:', mintErr);
        throw new Error(`Failed to create mint account: ${mintErr instanceof Error ? mintErr.message : String(mintErr)}`);
      }
      
      // APPROACH 2: Now create the NFT data with a separate transaction
      // This transaction doesn't need the mint keypair as a signer since the mint account already exists
      try {
        // Create the NFT data
        const createNftTx = await program.methods
          .createNft(
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
          })
          .transaction();
        
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        createNftTx.recentBlockhash = blockhash;
        createNftTx.feePayer = wallet.publicKey;
        
        // Sign with just the wallet (no need for mint keypair since it's already initialized)
        const signedNftTx = await wallet.signTransaction(createNftTx);
        
        // Send the transaction
        const nftTxId = await provider.connection.sendRawTransaction(signedNftTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });
        
        console.log('NFT data created with transaction:', nftTxId);
        
        // Wait for confirmation
        await provider.connection.confirmTransaction({
          signature: nftTxId,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        console.log('NFT data creation confirmed');
        
        setTxSignature(nftTxId);
        setNftMintAddress(nftMint.toString());
        return { tx: nftTxId, nftMint: nftMint.toString() };
      } catch (nftErr) {
        console.error('Error creating NFT data:', nftErr);
        throw new Error(`Failed to create NFT data: ${nftErr instanceof Error ? nftErr.message : String(nftErr)}`);
      }
    } catch (err) {
      console.error('Create NFT error:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createNft, loading, error, txSignature, nftMintAddress };
};

// Named export for useBuyNft
export const useBuyNft = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const buyNft = async (nftMintAddress: string) => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Program not initialized or wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
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
        
        // Get or create token accounts for buyer and seller
        const buyerNftTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey
        );
        
        const sellerNftTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          ownerPublicKey
        );
        
        console.log('Buying NFT with accounts:', {
          buyer: wallet.publicKey.toString(),
          buyerAccount: buyerAccount.toString(),
          sellerAccount: sellerAccount.toString(),
          nftData: nftData.toString(),
          nftMint: nftMint.toString(),
          sellerNftTokenAccount: sellerNftTokenAccount.toString(),
          buyerNftTokenAccount: buyerNftTokenAccount.toString(),
          tokenProgram: TOKEN_PROGRAM_ID.toString(),
          systemProgram: SystemProgram.programId.toString()
        });
        
        // Check if buyer token account exists, if not create it first
        let buyerTokenAccountExists = true;
        try {
          await provider.connection.getTokenAccountBalance(buyerNftTokenAccount);
        } catch (e) {
          buyerTokenAccountExists = false;
        }
        
        if (!buyerTokenAccountExists) {
          // Create the token account in a separate transaction first
          const createTokenAccountTx = new Transaction();
          createTokenAccountTx.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              buyerNftTokenAccount,
              wallet.publicKey,
              nftMint
            )
          );
          
          // Get a fresh blockhash
          const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
          createTokenAccountTx.recentBlockhash = blockhash;
          createTokenAccountTx.feePayer = wallet.publicKey;
          
          // Sign and send the token account creation transaction
          if (wallet.signTransaction) {
            const signedTx = await wallet.signTransaction(createTokenAccountTx);
            const tokenAccountTxId = await provider.connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            });
            
            // Wait for confirmation
            await provider.connection.confirmTransaction({
              signature: tokenAccountTxId,
              blockhash,
              lastValidBlockHeight
            }, 'confirmed');
            
            console.log('Token account created successfully:', tokenAccountTxId);
          } else {
            throw new Error('Wallet does not support signTransaction');
          }
        }
        
        // Now execute the buy NFT transaction
        const tx = await program.methods
          .buyNft()
          .accounts({
            buyer: wallet.publicKey,
            buyerAccount: buyerAccount,
            sellerAccount: sellerAccount,
            nftData: nftData,
            nftMint: nftMint,
            sellerNftTokenAccount: sellerNftTokenAccount,
            buyerNftTokenAccount: buyerNftTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc({
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            commitment: 'confirmed'
          });
        
        console.log('NFT purchase transaction sent and confirmed:', tx);
        setTxSignature(tx);
        return tx;
      } catch (fetchErr) {
        console.error('Error fetching NFT data:', fetchErr);
        throw new Error(`Failed to fetch NFT data: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      }
    } catch (err) {
      console.error('Buy NFT error:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { buyNft, loading, error, txSignature };
};

// Named export for useCreatePool with improved error handling
export const useCreatePool = () => {
  const { program, provider } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const createPool = async (
    initialPrice: number,
    slope: number,
    realTokenMint: string
  ) => {
    if (!program || !wallet.publicKey || !provider) {
      setError('Wallet not connected or program not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Validate real token mint format before attempting to create PublicKey
      if (typeof realTokenMint !== 'string' || !isValidPublicKeyFormat(realTokenMint)) {
        throw new Error('Invalid real token mint format');
      }
      
      // Use safePublicKey instead of direct PublicKey instantiation
      const realMint = safePublicKey(realTokenMint);
      if (!realMint) {
        throw new Error('Invalid real token mint address');
      }

      // Find PDAs with proper error handling
      try {
        // Find synthetic mint PDA
        const [syntheticMintPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('synthetic-mint'), realMint.toBuffer()],
          program.programId
        );

        // Find pool account PDA
        const [poolAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('bonding-pool'), realMint.toBuffer()],
          program.programId
        );
        
        // Find real token vault PDA
        const [realTokenVault] = PublicKey.findProgramAddressSync(
          [Buffer.from('token-vault'), realMint.toBuffer()],
          program.programId
        );

        console.log('Creating pool with accounts:', {
          authority: wallet.publicKey.toString(),
          realTokenMint: realMint.toString(),
          syntheticTokenMint: syntheticMintPDA.toString(),
          realTokenVault: realTokenVault.toString(),
          pool: poolAccount.toString(),
          systemProgram: SystemProgram.programId.toString(),
          tokenProgram: TOKEN_PROGRAM_ID.toString(),
          rent: SYSVAR_RENT_PUBKEY.toString()
        });

        // Create the transaction object first instead of directly calling rpc
        const transaction = await program.methods
          .createPool(
            new anchor.BN(initialPrice),
            new anchor.BN(slope)
          )
          .accounts({
            authority: wallet.publicKey,
            realTokenMint: realMint,
            syntheticTokenMint: syntheticMintPDA,
            realTokenVault: realTokenVault,
            pool: poolAccount,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .transaction();
        
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        
        // Sign with the wallet
        if (wallet.signTransaction) {
          const signedTx = await wallet.signTransaction(transaction);
          
          // Send with more detailed options
          const signature = await provider.connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true, // Skip preflight to avoid simulation errors
            maxRetries: 5,
            preflightCommitment: 'confirmed'
          });
          
          console.log('Pool creation transaction sent:', signature);
          
          // Wait for confirmation with more detailed error handling
          try {
            const confirmation = await provider.connection.confirmTransaction({
              signature,
              blockhash,
              lastValidBlockHeight
            }, 'confirmed');
            
            if (confirmation.value.err) {
              throw new Error(`Transaction confirmed but failed: ${JSON.stringify(confirmation.value.err)}`);
            }
            
            console.log('Pool creation transaction confirmed successfully');
            setTxSignature(signature);
            return signature;
          } catch (confirmErr) {
            console.error('Error confirming pool creation transaction:', confirmErr);
            throw new Error(`Transaction sent but confirmation failed: ${confirmErr instanceof Error ? confirmErr.message : String(confirmErr)}`);
          }
        } else {
          throw new Error('Wallet does not support signTransaction');
        }
      } catch (pdaErr) {
        console.error('Error finding PDAs:', pdaErr);
        throw new Error(`Failed to find PDAs: ${pdaErr instanceof Error ? pdaErr.message : String(pdaErr)}`);
      }
    } catch (err) {
      console.error('Error creating pool:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return { createPool, loading, error, txSignature };
};

// Re-export hooks as named exports to ensure compatibility
export { useCreateNft as default };
