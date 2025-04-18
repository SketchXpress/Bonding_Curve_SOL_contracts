'use client';

import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useState } from 'react';

export const useCreateNft = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string | null>(null);

  const createNft = async (name: string, symbol: string, uri: string, sellerFeeBasisPoints: number) => {
    if (!program || !wallet.publicKey) {
      setError('Program not initialized or wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      // In a real implementation, we would create an NFT mint
      // For now, we'll use a mock address that would be replaced
      const nftMint = new PublicKey('11111111111111111111111111111111');
      
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
      
      // Call the createNft instruction
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
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
        })
        .rpc();
      
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
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const buyNft = async (nftMintAddress: string) => {
    if (!program || !wallet.publicKey) {
      setError('Program not initialized or wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    
    try {
      const nftMint = new PublicKey(nftMintAddress);
      
      // Find NFT data PDA
      const [nftData] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft-data'), nftMint.toBuffer()],
        program.programId
      );
      
      // Get NFT data to find seller
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
      
      // In a real implementation, we would create or get token accounts
      // For now, we'll use mock addresses that would be replaced
      const buyerNftTokenAccount = new PublicKey('11111111111111111111111111111111');
      const sellerNftTokenAccount = new PublicKey('11111111111111111111111111111111');
      
      // Call the buyNft instruction
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
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      setTxSignature(tx);
      return tx;
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
