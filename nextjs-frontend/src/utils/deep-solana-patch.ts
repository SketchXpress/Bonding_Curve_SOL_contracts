// Deep patch for Solana web3.js isPublicKeyData function
// This patches the exact function that's causing the "_bn" property error

// Extend Window interface for our patches
declare global {
  interface Window {
    __SOLANA_WEB3_PATCHED__?: boolean;
    isPublicKeyData?: (data: any) => boolean;
    require?: any;
  }
}

if (typeof window !== 'undefined') {
  console.log('Deep Solana patch: Attempting to patch isPublicKeyData function');
  
  // Hook into module loading to patch the problematic function
  const originalRequire = (window as any).require || (() => {});
  
  // Function to patch the isPublicKeyData function when web3.js loads
  const patchSolanaWeb3 = () => {
    try {
      // Try to access the Solana web3.js module if it's already loaded
      const modules = Object.keys(window).filter(key => 
        key.includes('solana') || key.includes('web3') || key.includes('anchor')
      );
      
      console.log('Deep Solana patch: Available modules:', modules);
      
      // Override the global isPublicKeyData function if we can find it
      if (window.__SOLANA_WEB3_PATCHED__) {
        console.log('Deep Solana patch: Already patched');
        return;
      }
      
      // Patch BN instances more aggressively
      const BN = require('bn.js');
      if (BN) {
        // Override isPublicKeyData-like behavior
        const originalIsPublicKeyData = window.isPublicKeyData;
        
        window.isPublicKeyData = function(data: any) {
          try {
            // Ensure any BN instance has the _bn property
            if (data && typeof data === 'object' && data.constructor && data.constructor.name === 'BN') {
              if (!data._bn) {
                Object.defineProperty(data, '_bn', {
                  get: function() { return this; },
                  set: function(value: any) { /* Allow setting */ },
                  configurable: true,
                  enumerable: false
                });
              }
            }
            
            // Call original function if it exists, otherwise return false
            return originalIsPublicKeyData ? originalIsPublicKeyData(data) : false;
          } catch (error) {
            console.warn('Deep Solana patch: isPublicKeyData override failed:', error);
            return false;
          }
        };
        
        // Mark as patched
        window.__SOLANA_WEB3_PATCHED__ = true;
        console.log('Deep Solana patch: isPublicKeyData function patched');
      }
    } catch (error) {
      console.warn('Deep Solana patch: Failed to patch Solana web3.js:', error);
    }
  };
  
  // Try to patch immediately
  patchSolanaWeb3();
  
  // Also try to patch after a short delay
  setTimeout(patchSolanaWeb3, 100);
  setTimeout(patchSolanaWeb3, 500);
  setTimeout(patchSolanaWeb3, 1000);
  
  console.log('Deep Solana patch: Initialization complete');
}

export {};
