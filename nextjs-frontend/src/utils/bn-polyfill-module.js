/**
 * ES Module wrapper for BN polyfill
 */

// Apply the polyfill directly
if (typeof window !== 'undefined') {
  console.log('BN Polyfill Module: Applying patches');
  
  // Import and execute the polyfill script
  require('./bn-polyfill-direct.js');
  
  console.log('BN Polyfill Module: Patches applied');
}

export function applyBnPolyfill() {
  if (typeof window !== 'undefined') {
    try {
      require('./bn-polyfill-direct.js');
      console.log('BN Polyfill Module: Manual application successful');
    } catch (error) {
      console.warn('BN Polyfill Module: Failed to apply:', error);
    }
  }
}

export default applyBnPolyfill;
