import type { AppProps } from 'next/app';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.BN) {
      import('bn.js').then((BNModule) => {
        // Type assertion for proper constructor assignment
        window.BN = BNModule.default as typeof BNModule.default;
        console.log('BN.js initialized in browser context');
      });
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
