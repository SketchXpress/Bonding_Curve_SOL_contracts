'use client';

import { useEffect, useState } from 'react';
// Import from compiled JS file instead of TS file
import { patchBigIntBuffer } from '../utils/compiled/bn-polyfill-client';

/**
 * Enhanced component that applies the BigInt buffer patch on the client side
 * and monitors for wallet connection events
 */
export function BigIntPatcher() {
  const [patched, setPatched] = useState(false);

  useEffect(() => {
    // Apply the patch when the component mounts (client-side only)
    try {
      patchBigIntBuffer();
      setPatched(true);
      console.log('BigIntPatcher: Initial patch applied successfully');
    } catch (error) {
      console.error('BigIntPatcher: Error applying initial patch:', error);
    }

    // Set up a MutationObserver to detect DOM changes that might indicate wallet connection
    const observer = new MutationObserver((mutations) => {
      // Check if any wallet-related elements were added
      const walletElementsAdded = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => {
          if (node instanceof HTMLElement) {
            return node.className?.includes('wallet') || 
                  node.id?.includes('wallet') ||
                  node.innerHTML?.includes('wallet');
          }
          return false;
        })
      );

      if (walletElementsAdded) {
        console.log('BigIntPatcher: Detected wallet-related DOM changes, reapplying patch');
        // Reapply patch when wallet-related elements are added
        setTimeout(() => {
          try {
            patchBigIntBuffer();
            console.log('BigIntPatcher: Patch reapplied after DOM changes');
          } catch (error) {
            console.error('BigIntPatcher: Error reapplying patch after DOM changes:', error);
          }
        }, 100);
      }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });

    // Also set up an interval to periodically reapply the patch during critical operations
    const interval = setInterval(() => {
      if (document.querySelector('[data-wallet-adapter-modal-visible="true"]')) {
        console.log('BigIntPatcher: Detected active wallet modal, reapplying patch');
        try {
          patchBigIntBuffer();
        } catch (error) {
          console.error('BigIntPatcher: Error in interval patch:', error);
        }
      }
    }, 500);

    // Clean up
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  // This component doesn't render anything visible
  return (
    <div style={{ display: 'none' }} data-testid="bigint-patcher" data-patched={patched}>
      {/* Hidden element for testing purposes */}
    </div>
  );
}

export default BigIntPatcher;
