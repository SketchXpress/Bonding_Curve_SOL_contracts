'use client';

import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextProviderProps {
  children: ReactNode;
}

const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // State to track if we're on the client side
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    console.log('WalletContextProvider useEffect triggered');
    setIsClient(true);
  }, []);

  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Use empty wallets array to rely completely on standard wallet auto-detection
  // This prevents duplicate registrations and key conflicts
  // All modern wallets (Phantom, Solflare, etc.) will be automatically detected
  const wallets = useMemo(() => [], []);

  console.log('WalletContextProvider render - window:', typeof window, 'isClient:', isClient);

  // Always render on client side - Next.js 15 handles hydration better
  if (typeof window === 'undefined') {
    console.log('Returning server-side loading message');
    return <div>Initializing wallet providers...</div>;
  }

  // Wrap wallet provider in error boundary
  try {
    console.log('Rendering wallet providers');
    return (
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  } catch (error) {
    console.error('Error in wallet provider setup:', error);
    // Fallback UI when wallet provider fails
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>Wallet connection error. Please refresh the page or try disabling conflicting wallet extensions.</p>
        <p>Common issues include having both Phantom and Solflare extensions active simultaneously.</p>
      </div>
    );
  }
};

// Export both named and default exports for compatibility
export { WalletContextProvider };
export default WalletContextProvider;
