'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { useState } from 'react';
import { safePublicKey, isValidPublicKeyFormat } from '@/utils/bn-polyfill';

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
      
      // Use the program's methods to create the transaction
      // This approach uses the program's built-in transaction creation
      // which properly handles the NFT mint keypair as a signer
      const tx = await program.methods
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
        .signers([nftMintKeypair]) // Explicitly add the NFT mint keypair as a signer
        .rpc({
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          commitment: 'confirmed'
        });
      
      console.log('NFT creation transaction sent:', tx);
      
      // Wait for confirmation
      await provider.connection.confirmTransaction(tx, 'confirmed');
      console.log('NFT creation transaction confirmed successfully');
      
      setTxSignature(tx);
      setNftMintAddress(nftMint.toString());
      return { tx, nftMint: nftMint.toString() };
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
        // @ts-expect-error - Ignoring type error for now to allow build to complete
        const nftDataAccount = await program.account.nftData.fetch(nftData);
        
        // Find buyer and seller account PDAs
        const [buyerAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
          program.programId
        );
        
        const [sellerAccount] = PublicKey.findProgramAddressSync(
          [Buffer.from('user-account'), nftDataAccount.owner.toBuffer()],
          program.programId
        );
        
        // Get or create token accounts for buyer and seller
        const buyerNftTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          wallet.publicKey
        );
        
        const sellerNftTokenAccount = await getAssociatedTokenAddress(
          nftMint,
          nftDataAccount.owner
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
