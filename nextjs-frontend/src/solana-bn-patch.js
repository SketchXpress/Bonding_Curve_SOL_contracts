// Targeted BN.js Solana Compatibility Patch
// Based on actual @solana/web3.js source code analysis

console.log('[Solana BN Patch] Initializing targeted BN compatibility layer...');

// Critical: Ensure BN.js instances have _bn property for Solana compatibility
function patchBNForSolana() {
  try {
    // Import BN from actual source - browser compatible
    let BN = null;
    try {
      BN = require('bn.js');
    } catch (e) {
      // Browser environment or require not available
      if (typeof window !== 'undefined' && window.BN) {
        BN = window.BN;
      }
    }
    
    if (!BN || !BN.prototype) {
      console.warn('[Solana BN Patch] BN.js not found or invalid');
      return;
    }

    // The Solana web3.js isPublicKeyData function checks: return value._bn !== undefined;
    // And PublicKey constructor does: this._bn = value._bn || new BN(value)
    
    // Method 1: Add _bn property to all BN instances pointing to themselves
    const originalBN = BN;
    const patchedBN = function(...args) {
      const instance = new originalBN(...args);
      // Critical: Make the instance reference itself via _bn property
      instance._bn = instance;
      return instance;
    };
    
    // Copy all static methods and properties
    Object.setPrototypeOf(patchedBN, originalBN);
    Object.getOwnPropertyNames(originalBN).forEach(name => {
      if (name !== 'prototype' && name !== 'name' && name !== 'length') {
        try {
          patchedBN[name] = originalBN[name];
        } catch (e) {
          // Ignore non-configurable properties
        }
      }
    });
    
    // Ensure prototype chain is correct
    patchedBN.prototype = originalBN.prototype;
    
    // Patch prototype to ensure all BN instances get _bn property
    const originalPrototypeConstructor = originalBN.prototype.constructor;
    Object.defineProperty(originalBN.prototype, 'constructor', {
      value: function(...args) {
        const result = originalPrototypeConstructor.call(this, ...args);
        if (!this._bn) {
          this._bn = this;
        }
        return result;
      },
      writable: true,
      configurable: true
    });
    
    // Add _bn property to prototype if not exists
    if (!originalBN.prototype.hasOwnProperty('_bn')) {
      Object.defineProperty(originalBN.prototype, '_bn', {
        get: function() {
          return this.__bn_self__ || this;
        },
        set: function(value) {
          this.__bn_self__ = value;
        },
        configurable: true,
        enumerable: false
      });
    }
    
    // Method 2: Browser-compatible module interception
    if (typeof require !== 'undefined' && typeof window === 'undefined') {
      // Node.js environment only
      try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        
        Module.prototype.require = function(id) {
          const result = originalRequire.apply(this, arguments);
          
          if (id === 'bn.js' || id.endsWith('/bn.js') || 
              id.includes('@solana/web3.js') || 
              id.includes('@coral-xyz/anchor') ||
              id.includes('@metaplex')) {
            
            // Ensure all BN instances have _bn property
            if (result && typeof result === 'function') {
              const OriginalBN = result;
              
              // Patch the constructor
              const PatchedBN = function(...args) {
                const instance = new OriginalBN(...args);
                if (!instance._bn) {
                  instance._bn = instance;
                }
                return instance;
              };
              
              // Copy static properties
              Object.setPrototypeOf(PatchedBN, OriginalBN);
              Object.getOwnPropertyNames(OriginalBN).forEach(name => {
                if (name !== 'prototype' && name !== 'name' && name !== 'length') {
                  try {
                    PatchedBN[name] = OriginalBN[name];
                  } catch (e) {
                    // Ignore non-configurable properties
                  }
                }
              });
              
              PatchedBN.prototype = OriginalBN.prototype;
              
              return PatchedBN;
            }
            
            // For Solana modules, patch any PublicKey exports
            if (result && typeof result === 'object' && result.PublicKey) {
              const OriginalPublicKey = result.PublicKey;
              
              result.PublicKey = class extends OriginalPublicKey {
                constructor(...args) {
                  try {
                    super(...args);
                    // Ensure this PublicKey has _bn property if it doesn't already
                    if (!this._bn && this.constructor?.name === 'PublicKey') {
                      this._bn = this; // Solana compatibility
                    }
                  } catch (error) {
                    console.warn('[Solana BN Patch] PublicKey constructor patch failed:', error);
                    // Re-throw the original error
                    throw error;
                  }
                }
              };
              
              console.log('[Solana BN Patch] ✓ PublicKey constructor patched for', id);
            }
          }
          
          return result;
        };
        
        console.log('[Solana BN Patch] ✓ Node.js module require interception installed');
      } catch (moduleError) {
        console.warn('[Solana BN Patch] Module interception not available:', moduleError.message);
      }
    }
    
    // Method 3: Global BN patching for window/global objects
    if (typeof window !== 'undefined') {
      if (window.BN) {
        patchBNInstance(window.BN);
      }
      
      // Watch for BN to be assigned to window
      Object.defineProperty(window, 'BN', {
        get: function() {
          return this._BN;
        },
        set: function(value) {
          this._BN = patchBNInstance(value);
        },
        configurable: true
      });
    }
    
    if (typeof global !== 'undefined') {
      if (global.BN) {
        patchBNInstance(global.BN);
      }
      
      Object.defineProperty(global, 'BN', {
        get: function() {
          return this._BN;
        },
        set: function(value) {
          this._BN = patchBNInstance(value);
        },
        configurable: true
      });
    }
    
    function patchBNInstance(BNClass) {
      if (!BNClass || typeof BNClass !== 'function') return BNClass;
      
      // Add _bn to all new instances
      const original = BNClass;
      const patched = function(...args) {
        const instance = new original(...args);
        instance._bn = instance;
        return instance;
      };
      
      Object.setPrototypeOf(patched, original);
      Object.getOwnPropertyNames(original).forEach(name => {
        if (name !== 'prototype' && name !== 'name' && name !== 'length') {
          try {
            patched[name] = original[name];
          } catch (e) {
            // Ignore
          }
        }
      });
      
      patched.prototype = original.prototype;
      
      return patched;
    }
    
    console.log('[Solana BN Patch] Successfully applied targeted BN.js compatibility layer');
    
  } catch (error) {
    console.error('[Solana BN Patch] Error applying patch:', error);
  }
}

// Apply patch immediately
patchBNForSolana();

// Method 4: Direct isPublicKeyData monkey patch - Enhanced for better compatibility
try {
  // Find and patch the isPublicKeyData function directly
  const globalObj = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined') ? global : {};
  const originalIsPublicKeyData = globalObj.isPublicKeyData;
  
  globalObj.isPublicKeyData = function(value) {
    // Always return true for BN-like objects, ensuring compatibility
    if (value && (value._bn !== undefined || value.constructor?.name === 'BN' || value.isBN)) {
      return true;
    }
    
    // If we have BN.js available, check if it's a BN instance
    try {
      let BN = null;
      try {
        BN = require('bn.js');
      } catch (e) {
        if (typeof window !== 'undefined' && window.BN) {
          BN = window.BN;
        }
      }
      
      if (BN && value instanceof BN) {
        // Ensure the BN instance has _bn property
        if (!value._bn) {
          value._bn = value;
        }
        return true;
      }
    } catch (e) {
      // BN.js not available
    }
    
    // Enhanced PublicKey detection
    if (value && typeof value === 'object') {
      // Check if it looks like a PublicKey
      if (value.toBase58 && value.toString && typeof value.toBase58 === 'function') {
        // Ensure it has _bn for Solana compatibility
        if (!value._bn) {
          value._bn = value;
        }
        return true;
      }
    }
    
    // Fallback to original logic
    return originalIsPublicKeyData ? originalIsPublicKeyData(value) : false;
  };
  
  console.log('[Solana BN Patch] Successfully patched isPublicKeyData function');
} catch (error) {
  console.warn('[Solana BN Patch] Could not patch isPublicKeyData function:', error);
}

// Method 5: Global error handler for _bn errors with automatic re-patching
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && message.toString().includes('_bn')) {
      console.warn('[Solana BN Patch] Detected _bn error, re-applying patches:', message);
      
      // Re-apply patches
      setTimeout(() => {
        try {
          patchBNForSolana();
          console.log('[Solana BN Patch] ✓ Patches re-applied after _bn error');
        } catch (e) {
          console.error('[Solana BN Patch] Failed to re-apply patches:', e);
        }
      }, 100);
    }
    
    // Call original error handler
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    
    return false;
  };
  
  console.log('[Solana BN Patch] ✓ Global error handler installed for _bn errors');
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { patchBNForSolana };
} else if (typeof window !== 'undefined') {
  window.patchBNForSolana = patchBNForSolana;
}
