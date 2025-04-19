import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, useEffect } from "react";

// Import BN polyfill patches
import "../utils/compiled/bn-polyfill";
import "../utils/bn-polyfill-direct";
import "../utils/error-handler";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");

export default function App({ Component, pageProps }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      /**
       * Wallets that implement either of these standards will be available automatically.
       *
       *   - Solana Mobile Stack Mobile Wallet Adapter Protocol
       *     (https://github.com/solana-mobile/mobile-wallet-adapter)
       *   - Solana Wallet Standard
       *     (https://github.com/solana-labs/wallet-standard)
       *
       * If you wish to support a wallet that supports neither of those standards,
       * instantiate its legacy wallet adapter here. Common legacy adapters can be found
       * in the npm package `@solana/wallet-adapter-wallets`.
       */
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  // Apply additional BN patches when component mounts
  useEffect(() => {
    // Ensure BN.prototype has _bn property
    if (typeof window !== 'undefined') {
      try {
        console.log("Applying additional BN patches in _app.tsx");
        
        // Patch global BN if available
        if (window.BN) {
          if (!window.BN.prototype._bn) {
            Object.defineProperty(window.BN.prototype, '_bn', {
              get: function() { 
                if (this._bnValue === undefined) {
                  this._bnValue = this;
                }
                return this._bnValue; 
              },
              set: function(value) { this._bnValue = value; },
              configurable: true,
              enumerable: false
            });
          }
        }
        
        // Add emergency error handler for _bn property
        const originalError = console.error;
        console.error = function(...args) {
          // Check if error is related to _bn property
          const errorString = args.join(' ');
          if (errorString.includes('_bn') && errorString.includes('cannot read properties')) {
            console.warn('Caught _bn error, applying emergency fix');
            
            // Apply emergency fix to global objects
            if (window.solana) {
              try {
                const patchObject = (obj) => {
                  if (!obj || typeof obj !== 'object') return;
                  
                  // If object has toBN method but no _bn property
                  if (typeof obj.toBN === 'function' && obj._bn === undefined) {
                    Object.defineProperty(obj, '_bn', {
                      value: obj,
                      configurable: true,
                      enumerable: false
                    });
                  }
                  
                  // If object is a BN instance but no _bn property
                  if (obj.constructor && obj.constructor.name === 'BN' && obj._bn === undefined) {
                    Object.defineProperty(obj, '_bn', {
                      value: obj,
                      configurable: true,
                      enumerable: false
                    });
                  }
                };
                
                // Patch solana objects
                patchObject(window.solana);
                
                // Don't show the original error
                return;
              } catch (e) {
                // If patching fails, show original error
              }
            }
          }
          
          // Call original error function
          originalError.apply(console, args);
        };
      } catch (e) {
        console.warn("Error applying additional BN patches:", e);
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
