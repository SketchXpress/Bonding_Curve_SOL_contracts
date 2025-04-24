'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
      
      console.log('Creating NFT with accounts:', {
        creator: wallet.publicKey.toString(),
        nftMint: nftMint.toString(),
        nftData: nftData.toString(),
        userAccount: userAccount.toString(),
        systemProgram: SystemProgram.programId.toString(),
        tokenProgram: TOKEN_PROGRAM_ID.toString(),
        rent: SYSVAR_RENT_PUBKEY.toString(),
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID.toString(),
        metadataAccount: metadataAccount.toString(),
        masterEditionAccount: masterEditionAccount.toString()
      });
      
      // Create a modified IDL that correctly marks nftMint as a signer
      const modifiedIdl = JSON.parse(JSON.stringify(program.idl));
      
      // Find the createNft instruction in the IDL
      const createNftInstruction = modifiedIdl.instructions.find(
        (ix: any) => ix.name === 'createNft'
      );
      
      if (!createNftInstruction) {
        throw new Error('Could not find createNft instruction in IDL');
      }
      
      // Find the nftMint account in the instruction accounts
      const nftMintAccount = createNftInstruction.accounts.find(
        (acc: any) => acc.name === 'nftMint'
      );
      
      if (!nftMintAccount) {
        throw new Error('Could not find nftMint account in createNft instruction');
      }
      
      // Mark nftMint as a signer in the IDL
      nftMintAccount.isSigner = true;
      
      // Create a new program instance with the modified IDL
      const modifiedProgram = new anchor.Program(
        modifiedIdl,
        program.programId,
        provider
      );
      
      // Use the modified program to create the NFT in a single transaction
      try {
        // Get the instruction with the modified IDL
        const createNftTx = await modifiedProgram.methods
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
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            metadataAccount: metadataAccount,
            masterEditionAccount: masterEditionAccount
          })
          .transaction();
        
        // Get a fresh blockhash
        const { blockhash, lastValidBlockHeight } = await provider.connection.getLatestBlockhash('confirmed');
        createNftTx.recentBlockhash = blockhash;
        createNftTx.feePayer = wallet.publicKey;
        
        // Check if wallet adapter supports signing
        if (!wallet.signTransaction) {
          throw new Error('Wallet does not support transaction signing');
        }
        
        // Sign with wallet first
        const partiallySignedTx = await wallet.signTransaction(createNftTx);
        
        // Then sign with the mint keypair
        partiallySignedTx.partialSign(nftMintKeypair);
        
        // Send and confirm transaction
        const signature = await provider.connection.sendRawTransaction(
          partiallySignedTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );
        
        console.log('Transaction sent:', signature);
        
        // Wait for confirmation
        await provider.connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        console.log('NFT creation confirmed with signature:', signature);
        
        setTxSignature(signature);
        setNftMintAddress(nftMint.toString());
        return { tx: signature, nftMint: nftMint.toString() };
      } catch (nftErr) {
        console.error('Error creating NFT:', nftErr);
        throw new Error(`Failed to create NFT: ${nftErr instanceof Error ? nftErr.message : String(nftErr)}`);
      }
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

  return { buyNft, loading: loading || userAccountLoading, error, txSignature };
};

// Helper functions for token accounts
async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  // This is a simplified version - in a real app, use the proper SPL token library function
  return PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  )[0];
}

function createAssociatedTokenAccountInstruction(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey
): any {
  // This is a simplified version - in a real app, use the proper SPL token library function
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    data: Buffer.from([]),
  });
}
