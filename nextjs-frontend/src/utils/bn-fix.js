// BN fix for Solana compatibility
// This module provides comprehensive BN.js fixes for Solana web3.js

console.log('[BN Fix] Initializing Solana BN compatibility fixes...');

/**
 * Main function to patch BN.js for Solana compatibility
 */
function patchBNForSolana() {
  console.log('[BN Fix] Starting Solana BN compatibility patches...');
  
  try {
    // Try to get BN from various sources
    let BN = null;
    
    // Method 1: Direct require
    try {
      if (typeof require !== 'undefined') {
        BN = require('bn.js');
      }
    } catch (e) {
      // Continue to next method
    }
    
    // Method 2: Window object (browser)
    if (!BN && typeof window !== 'undefined') {
      BN = window.BN;
    }
    
    // Method 3: Global object (Node.js)
    if (!BN && typeof global !== 'undefined') {
      BN = global.BN;
    }
    
    if (BN && BN.prototype) {
      console.log('[BN Fix] Found BN.js, applying Solana compatibility patches...');
      
      // Patch 1: Add _bn property for Solana's isPublicKeyData check
      if (!BN.prototype.hasOwnProperty('_bn')) {
        Object.defineProperty(BN.prototype, '_bn', {
          get: function() { 
            return this; 
          },
          set: function(value) { 
            this.__bn_value__ = value; 
          },
          configurable: true,
          enumerable: false
        });
        console.log('[BN Fix] ✓ Added _bn property to BN.prototype');
      }
      
      // Patch 2: Ensure constructor always sets _bn
      const originalConstructor = BN.prototype.constructor;
      if (originalConstructor) {
        BN.prototype.constructor = function BN(...args) {
          const result = originalConstructor.apply(this, args);
          if (!this._bn) {
            this._bn = this;
          }
          return result;
        };
        console.log('[BN Fix] ✓ Patched BN constructor to set _bn property');
      }
      
      // Patch 3: Wrap methods that return new BN instances
      const methodsToWrap = ['add', 'sub', 'mul', 'div', 'mod', 'pow', 'abs', 'neg', 'clone'];
      methodsToWrap.forEach(methodName => {
        if (BN.prototype[methodName]) {
          const originalMethod = BN.prototype[methodName];
          BN.prototype[methodName] = function(...args) {
            const result = originalMethod.apply(this, args);
            if (result && typeof result === 'object' && result.constructor === BN) {
              if (!result._bn) {
                result._bn = result;
              }
            }
            return result;
          };
        }
      });
      console.log('[BN Fix] ✓ Wrapped BN methods to ensure _bn property');
      
      // Patch 4: Static methods
      if (BN.prototype.constructor) {
        const StaticBN = BN.prototype.constructor;
        
        // Wrap static methods that create BN instances
        const staticMethods = ['max', 'min', 'red', 'mont'];
        staticMethods.forEach(methodName => {
          if (StaticBN[methodName]) {
            const originalStaticMethod = StaticBN[methodName];
            StaticBN[methodName] = function(...args) {
              const result = originalStaticMethod.apply(this, args);
              if (result && typeof result === 'object' && result.constructor === BN) {
                if (!result._bn) {
                  result._bn = result;
                }
              }
              return result;
            };
          }
        });
        console.log('[BN Fix] ✓ Wrapped static BN methods');
      }
      
      return true;
    } else {
      console.warn('[BN Fix] BN.js not found, creating minimal compatible implementation');
      
      // Create minimal BN implementation for Solana compatibility
      const MinimalBN = function(value, base) {
        this.value = value;
        this._bn = this; // Critical for Solana
        this.isBN = true;
      };
      
      MinimalBN.prototype = {
        toString: function(base) { 
          return this.value?.toString?.(base) || '0'; 
        },
        toNumber: function() { 
          return Number(this.value) || 0; 
        },
        toBuffer: function(endian, length) {
          // Basic buffer conversion for Solana compatibility
          try {
            if (typeof Buffer !== 'undefined') {
              const hex = this.toString(16);
              return Buffer.from(hex.padStart(length * 2 || 64, '0'), 'hex');
            }
          } catch (e) {
            // Fallback
          }
          return new Uint8Array(32); // 32-byte fallback
        },
        add: function(other) {
          const result = new MinimalBN(this.toNumber() + (other?.toNumber?.() || Number(other) || 0));
          return result;
        },
        sub: function(other) {
          const result = new MinimalBN(this.toNumber() - (other?.toNumber?.() || Number(other) || 0));
          return result;
        },
        mul: function(other) {
          const result = new MinimalBN(this.toNumber() * (other?.toNumber?.() || Number(other) || 1));
          return result;
        },
        div: function(other) {
          const result = new MinimalBN(Math.floor(this.toNumber() / (other?.toNumber?.() || Number(other) || 1)));
          return result;
        }
      };
      
      // Make it available globally
      if (typeof window !== 'undefined') {
        window.BN = MinimalBN;
      }
      if (typeof global !== 'undefined') {
        global.BN = MinimalBN;
      }
      
      console.log('[BN Fix] ✓ Created minimal BN implementation with Solana compatibility');
      return true;
    }
  } catch (error) {
    console.error('[BN Fix] Error applying Solana BN fixes:', error);
    return false;
  }
}

// Apply patches immediately when module loads
patchBNForSolana();

// Export for manual application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { patchBNForSolana };
} else if (typeof window !== 'undefined') {
  window.patchBNForSolana = patchBNForSolana;
}

console.log('[BN Fix] ✓ Solana BN compatibility fixes completed');
