// Global BigInt polyfill that runs immediately
// This file should be imported at the very top of your application

if (typeof window !== 'undefined') {
  console.log('Global polyfill: Applying BN patch immediately');
  
  try {
    // Import deep Solana patch first
    import('./utils/deep-solana-patch.ts');
    
    // Import the polyfill directly
    require('./utils/bn-polyfill-direct.js');
    console.log('Global polyfill: Successfully applied');
  } catch (error) {
    console.warn('Global polyfill: Failed to apply:', error);
  }
  
  // Set up a global error handler for _bn errors
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && message.includes && message.includes('_bn')) {
      console.warn('Caught _bn error, reapplying polyfill:', message);
      try {
        require('./utils/bn-polyfill-direct.js');
      } catch (patchError) {
        console.error('Failed to reapply polyfill:', patchError);
      }
    }
    
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };
}
