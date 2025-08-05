'use client';

import { useEffect } from 'react';
import { applyClientPatches } from '@/utils/bn-polyfill-client';

export default function GlobalPatcher() {
  useEffect(() => {
    console.log('GlobalPatcher: Applying client patches early in the lifecycle.');
    
    try {
      // Apply our client patches first
      applyClientPatches();
      console.log('GlobalPatcher: Client patches applied successfully.');
      
      // Load the comprehensive polyfills dynamically for browser only
      if (typeof window !== 'undefined') {
        Promise.all([
          import('../utils/bn-fix').then(module => {
            if (module.patchBNForSolana) {
              module.patchBNForSolana();
              console.log('GlobalPatcher: BN fix applied');
            }
          }),
          import('../global-polyfill').then(() => {
            console.log('GlobalPatcher: Global polyfill loaded');
          }),
          import('../solana-bn-patch').then(module => {
            if (module.patchBNForSolana) {
              module.patchBNForSolana();
              console.log('GlobalPatcher: Solana BN patch applied');
            }
          })
        ]).then(() => {
          console.log('GlobalPatcher: All polyfills loaded successfully');
        }).catch(error => {
          console.warn('GlobalPatcher: Some polyfills failed to load:', error);
        });
      }
      
    } catch (error) {
      console.error('GlobalPatcher: Error applying client patches:', error);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return null; // This component does not render anything visible
}
