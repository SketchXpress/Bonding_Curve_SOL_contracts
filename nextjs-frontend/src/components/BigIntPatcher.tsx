'use client';

import { useEffect, useState } from 'react';

// Apply patch immediately when module loads
if (typeof window !== 'undefined') {
  try {
    require('@/utils/bn-polyfill-direct.js');
    console.log('BigIntPatcher: Module-level patch applied');
  } catch (error) {
    console.warn('BigIntPatcher: Module-level patch failed:', error);
  }
}

/**
 * Enhanced component that applies the BigInt buffer patch on the client side
 * and monitors for wallet connection events
 */
function BigIntPatcher() {
  const [patched, setPatched] = useState(false);

  useEffect(() => {
    // Apply the patch when the component mounts (client-side only)
    const applyPatch = () => {
      try {
        if (typeof window !== 'undefined') {
          // Apply direct polyfill for immediate effect
          require('../utils/bn-polyfill-direct.js');
          setPatched(true);
          console.log('BigIntPatcher: Direct patch applied successfully');
          return true;
        }
      } catch (error) {
        console.error('BigIntPatcher: Error applying patch:', error);
        return false;
      }
      return false;
    };

    // Apply patch immediately
    applyPatch();

    // Set up aggressive polling to ensure patch stays applied
    const aggressiveInterval = setInterval(() => {
      try {
        if (typeof window !== 'undefined') {
          require('@/utils/bn-polyfill-direct.js');
        }
      } catch (error) {
        console.warn('BigIntPatcher: Error in aggressive interval:', error);
      }
    }, 100); // Every 100ms

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
          applyPatch();
        }, 50);
      }
    });

    // Start observing the document with the configured parameters
    if (typeof document !== 'undefined') {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Also set up an interval to periodically reapply the patch during critical operations
    const modalInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.querySelector('[data-wallet-adapter-modal-visible="true"]')) {
        console.log('BigIntPatcher: Detected active wallet modal, reapplying patch');
        applyPatch();
      }
    }, 200);

    // Clean up
    return () => {
      observer.disconnect();
      clearInterval(aggressiveInterval);
      clearInterval(modalInterval);
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
