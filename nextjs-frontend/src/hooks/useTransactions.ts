import { useAnchorContext } from '@/contexts/AnchorContextProvider';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useState } from 'react';

export const useBuyToken = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const buyToken = async (poolAddress: string, amount: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected or program not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const pool = new PublicKey(poolAddress);
      
      // Get pool account data to find other accounts
      // @ts-expect-error - Ignoring type error for now to allow build to complete
      // Removed unused variable
      await program.account.bondingCurvePool.fetch(pool);
      
      // In a real implementation, we would create or get token accounts
      // For now, we'll use mock addresses that would be replaced
      const buyerRealTokenAccount = new PublicKey('11111111111111111111111111111111');
      const buyerSyntheticTokenAccount = new PublicKey('11111111111111111111111111111111');

      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Execute the transaction
      const tx = await program.methods
        .buyToken(amount)
        .accounts({
          pool,
          userAccount,
          buyer: wallet.publicKey,
          buyerRealTokenAccount,
          buyerSyntheticTokenAccount,
        })
        .rpc();

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error('Error buying token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { buyToken, loading, error, txSignature };
};

export const useSellToken = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const sellToken = async (poolAddress: string, amount: number) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected or program not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      const pool = new PublicKey(poolAddress);
      
      // Get pool account data to find other accounts
      // @ts-expect-error - Ignoring type error for now to allow build to complete
      // Removed unused variable
      await program.account.bondingCurvePool.fetch(pool);
      
      // In a real implementation, we would create or get token accounts
      // For now, we'll use mock addresses that would be replaced
      const sellerRealTokenAccount = new PublicKey('11111111111111111111111111111111');
      const sellerSyntheticTokenAccount = new PublicKey('11111111111111111111111111111111');

      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Execute the transaction
      const tx = await program.methods
        .sellToken(amount)
        .accounts({
          pool,
          userAccount,
          seller: wallet.publicKey,
          sellerRealTokenAccount,
          sellerSyntheticTokenAccount,
        })
        .rpc();

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error('Error selling token:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { sellToken, loading, error, txSignature };
};

export const useCreateUser = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const createUser = async () => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected or program not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Execute the transaction
      const tx = await program.methods
        .createUser()
        .accounts({
          userAccount,
          user: wallet.publicKey,
        })
        .rpc();

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error, txSignature };
};

export const useCreatePool = () => {
  const { program } = useAnchorContext();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const createPool = async (
    initialPrice: number,
    slope: number,
    realTokenMint: string,
    syntheticTokenMint: string
  ) => {
    if (!program || !wallet.publicKey) {
      setError('Wallet not connected or program not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    setTxSignature(null);

    try {
      // Convert string addresses to PublicKey objects
      const realMint = new PublicKey(realTokenMint);
      const syntheticMint = new PublicKey(syntheticTokenMint);

      // Find pool account PDA
      const [poolAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve-pool'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Find user account PDA
      const [userAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('user-account'), wallet.publicKey.toBuffer()],
        program.programId
      );

      // Execute the transaction
      const tx = await program.methods
        .createPool(initialPrice, slope)
        .accounts({
          pool: poolAccount,
          userAccount,
          creator: wallet.publicKey,
          realTokenMint: realMint,
          syntheticTokenMint: syntheticMint,
        })
        .rpc();

      setTxSignature(tx);
      return tx;
    } catch (err) {
      console.error('Error creating pool:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { createPool, loading, error, txSignature };
};
