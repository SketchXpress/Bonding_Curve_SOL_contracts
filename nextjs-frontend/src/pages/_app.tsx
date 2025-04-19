import type { AppProps } from 'next/app';
import { useEffect } from 'react';

// Import polyfill at the very top of the file
import '../utils/bn-polyfill';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Run polyfill again on client-side to ensure it's applied after hydration
    if (typeof window !== 'undefined') {
      // Dynamic import to avoid server-side issues
      import('../utils/bn-polyfill').then(module => {
        module.patchBigintBuffer();
        console.log('Client-side bigint-buffer patch applied');
      });
    }
  }, []);

  return (
    <>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
