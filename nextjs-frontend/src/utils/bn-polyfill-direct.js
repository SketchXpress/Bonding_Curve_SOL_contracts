// Direct BN polyfill for immediate application
// This file provides the most aggressive BN.js patching for Solana compatibility

console.log('[BN Polyfill Direct] Applying immediate BN.js patches...');

// Function to patch BN.js with _bn property
function patchBNDirect() {
  try {
    // Try to get BN from various sources
    let BN = null;
    
    // Method 1: Try require (Node.js/bundler environment)
    try {
      if (typeof require !== 'undefined') {
        BN = require('bn.js');
      }
    } catch (e) {
      // Ignore require errors
    }
    
    // Method 2: Check window/global object
    if (!BN && typeof window !== 'undefined' && window.BN) {
      BN = window.BN;
    }
    
    // Method 3: Check global object
    if (!BN && typeof global !== 'undefined' && global.BN) {
      BN = global.BN;
    }
    
    if (BN && BN.prototype) {
      // Add _bn property to BN prototype if it doesn't exist
      if (!BN.prototype.hasOwnProperty('_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() { return this; },
          set: function(value) { this.__bn_internal__ = value; },
          configurable: true,
          enumerable: false
        });
        console.log('[BN Polyfill Direct] ✓ Added _bn property to BN.prototype');
      }
      
      // Monkey patch the constructor to ensure _bn is always set
      const originalBN = BN;
      function PatchedBN(...args) {
        const instance = new originalBN(...args);
        if (!instance._bn) {
          instance._bn = instance;
        }
        return instance;
      }
      
      // Copy all static properties and methods
      Object.setPrototypeOf(PatchedBN, originalBN);
      Object.setPrototypeOf(PatchedBN.prototype, originalBN.prototype);
      Object.assign(PatchedBN, originalBN);
      
      // Replace in all possible locations
      if (typeof window !== 'undefined') {
        window.BN = PatchedBN;
      }
      if (typeof global !== 'undefined') {
        global.BN = PatchedBN;
      }
      
      console.log('[BN Polyfill Direct] ✓ Monkey patched BN constructor to ensure _bn property');
      
      return true;
    } else {
      console.warn('[BN Polyfill Direct] BN.js not found, creating fallback');
      
      // Create a minimal BN fallback with _bn support
      const FallbackBN = function(value) {
        this.value = value;
        this._bn = this;
        this.isBN = true;
      };
      
      FallbackBN.prototype = {
        toString: function() { return this.value?.toString() || '0'; },
        toNumber: function() { return Number(this.value) || 0; },
        add: function(other) { 
          const result = new FallbackBN(this.toNumber() + (other?.toNumber?.() || Number(other) || 0));
          return result;
        },
        sub: function(other) { 
          const result = new FallbackBN(this.toNumber() - (other?.toNumber?.() || Number(other) || 0));
          return result;
        }
      };
      
      if (typeof window !== 'undefined') {
        window.BN = FallbackBN;
      }
      if (typeof global !== 'undefined') {
        global.BN = FallbackBN;
      }
      
      console.log('[BN Polyfill Direct] ✓ Created fallback BN with _bn support');
      return true;
    }
  } catch (error) {
    console.error('[BN Polyfill Direct] Error applying patch:', error);
    return false;
  }
}

// Apply patch immediately when this module is loaded
patchBNDirect();

// Export the patch function for manual application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { patchBNDirect };
}

console.log('[BN Polyfill Direct] ✓ Direct BN polyfill completed');
