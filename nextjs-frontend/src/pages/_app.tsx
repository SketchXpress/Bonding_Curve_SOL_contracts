import "@/styles/global.css";
import type { AppProps } from "next/app";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo, useEffect } from "react";
import GlobalPatcher from "@/components/GlobalPatcher"; // Import GlobalPatcher

// Import BN polyfill patches - these are likely handled by GlobalPatcher now or bn-polyfill-client
// import "../utils/compiled/bn-polyfill";
// import "../utils/compiled/bn-polyfill-client"; // This is called by GlobalPatcher
// import "../utils/bn-polyfill-direct";
// import "../utils/error-handler";

// BN type is imported in global.d.ts

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

export default function App({ Component, pageProps }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  // The existing useEffect for BN patching might be redundant if GlobalPatcher and bn-polyfill-client cover these cases.
  // It's recommended to review and potentially remove or merge this logic into bn-polyfill-client.ts for centralization.
  useEffect(() => {
    // Ensure BN.prototype has _bn property
    if (typeof window !== 'undefined') {
      try {
        console.log("Verifying BN patches in _app.tsx (GlobalPatcher should handle this)");
        
        if (window.BN) {
          if (!window.BN.prototype._bn) {
            console.warn("_app.tsx: window.BN.prototype._bn still missing after GlobalPatcher, attempting to patch here.");
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
        
        const originalError = console.error;
        console.error = function(...args) {
          const errorString = args.join(' ');
          if (errorString.includes('_bn') && errorString.includes('cannot read properties')) {
            console.warn('_app.tsx: Caught _bn error, attempting emergency fix (consider centralizing this logic)');
            if (window.solana) {
              try {
                const patchObject = (obj: Record<string, unknown>): void => {
                  if (!obj || typeof obj !== 'object') return;
                  if (typeof obj.toBN === 'function' && obj._bn === undefined) {
                    Object.defineProperty(obj, '_bn', {
                      value: obj,
                      configurable: true,
                      enumerable: false
                    });
                  }
                  if (obj.constructor && obj.constructor.name === 'BN' && obj._bn === undefined) {
                    Object.defineProperty(obj, '_bn', {
                      value: obj,
                      configurable: true,
                      enumerable: false
                    });
                  }
                };
                patchObject(window.solana);
                return;
              } catch {}
            }
          }
          originalError.apply(console, args);
        };
      } catch (error) {
        console.warn("_app.tsx: Error in additional BN patch verification:", error);
      }
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GlobalPatcher /> {/* Add GlobalPatcher here */}
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

