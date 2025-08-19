import { useMemo } from 'react';
import { AnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@project-serum/anchor';

export function useAnchorProvider() {
  const { connection } = useConnection();
  const wallet = useWallet();

  return useMemo(() => {
    if (!wallet) return null;

    return new AnchorProvider(
      connection,
      wallet as AnchorWallet,
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);
}
