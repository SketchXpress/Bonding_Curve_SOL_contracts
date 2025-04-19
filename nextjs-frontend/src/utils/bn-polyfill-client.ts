'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = patchBigIntBuffer;

var _bnJs = _interopRequireDefault(require("bn.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Enhanced client-side patch for BigInt buffer handling
 */
function patchBigIntBuffer() {
  try {
    console.log('Applying enhanced client-side BigInt buffer patch for Solana wallet');
    
    // Apply client-side specific patches
    if (typeof window !== 'undefined') {
      // Patch the BN constructor to handle undefined _bn property
      patchBNConstructor();
      
      // Patch specific Solana libraries that use BN
      patchSolanaLibraries();
      
      // Recursively patch all BN instances in the window object
      patchAllBNInstances();
      
      // Add serialization support for BigInt in JSON
      addBigIntJSONSupport();
      
      // Add defensive getters and setters for _bn property
      addDefensiveBNPropertyHandling();
      
      // Set up a mutation observer to reapply patches when DOM changes
      setupMutationObserver();
      
      console.log('Enhanced client-side BigInt buffer patch applied successfully');
    }
  } catch (error) {
    console.error('Error applying enhanced client-side BigInt buffer patch:', error);
  }
}

/**
 * Patch the BN constructor to ensure _bn property exists
 */
function patchBNConstructor() {
  try {
    if (typeof window !== 'undefined') {
      // First patch the BN prototype
      patchBNPrototype();
      
      // Then patch the global BN constructor if it exists
      if (window.BN) {
        const originalBN = window.BN;
        
        // Create a patched constructor
        window.BN = function(...args) {
          const instance = new originalBN(...args);
          
          // Ensure _bn property exists and points to itself
          if (!instance._bn) {
            Object.defineProperty(instance, '_bn', {
              value: instance,
              configurable: true,
              enumerable: false,
              writable: true
            });
          }
          
          return instance;
        };
        
        // Copy prototype and static properties
        window.BN.prototype = originalBN.prototype;
        Object.setPrototypeOf(window.BN, originalBN);
        
        console.log('Monkey patched BN constructor to ensure _bn property');
      }
    }
  } catch (error) {
    console.error('Error patching BN constructor:', error);
  }
}

/**
 * Patch the BN prototype with necessary methods and property definitions
 */
function patchBNPrototype() {
  try {
    // Add defensive methods to BN.prototype
    if (_bnJs.default && _bnJs.default.prototype) {
      // Add toJSON method if missing
      if (!_bnJs.default.prototype.toJSON) {
        _bnJs.default.prototype.toJSON = function() {
          try {
            return this.toString(10);
          } catch (e) {
            console.error('Error in BN.prototype.toJSON:', e);
            return '0';
          }
        };
      }
      
      // Add toNumber method if missing
      if (!_bnJs.default.prototype.toNumber) {
        _bnJs.default.prototype.toNumber = function() {
          try {
            return parseInt(this.toString(10), 10);
          } catch (e) {
            console.error('Error in BN.prototype.toNumber:', e);
            return 0;
          }
        };
      }
      
      // Add toBN method if missing
      if (!_bnJs.default.prototype.toBN) {
        _bnJs.default.prototype.toBN = function() {
          return this;
        };
      }
      
      // Define _bn property on the prototype with a getter that returns this
      // This is a fallback if the direct property assignment fails
      if (!Object.getOwnPropertyDescriptor(_bnJs.default.prototype, '_bn')) {
        Object.defineProperty(_bnJs.default.prototype, '_bn', {
          get: function() {
            // If _bn is undefined, return this
            if (this._bnValue === undefined) {
              this._bnValue = this;
            }
            return this._bnValue;
          },
          set: function(value) {
            this._bnValue = value;
          },
          configurable: true,
          enumerable: false
        });
      }
      
      console.log('Patched BN.prototype with _bn property');
    }
  } catch (error) {
    console.error('Error patching BN prototype:', error);
  }
}

/**
 * Add defensive getters and setters for _bn property
 */
function addDefensiveBNPropertyHandling() {
  try {
    // Monkey patch Object.prototype.hasOwnProperty to handle _bn property specially
    const originalHasOwnProperty = Object.prototype.hasOwnProperty;
    Object.prototype.hasOwnProperty = function(prop) {
      // Special case for _bn property on BN-like objects
      if (prop === '_bn' && 
          this && 
          typeof this === 'object' && 
          (this.constructor && this.constructor.name === 'BN' || typeof this.toBN === 'function')) {
        return true;
      }
      return originalHasOwnProperty.call(this, prop);
    };
    
    // Monkey patch Object.prototype.propertyIsEnumerable to handle _bn property specially
    const originalPropertyIsEnumerable = Object.prototype.propertyIsEnumerable;
    Object.prototype.propertyIsEnumerable = function(prop) {
      // Special case for _bn property on BN-like objects
      if (prop === '_bn' && 
          this && 
          typeof this === 'object' && 
          (this.constructor && this.constructor.name === 'BN' || typeof this.toBN === 'function')) {
        return false;
      }
      return originalPropertyIsEnumerable.call(this, prop);
    };
    
    console.log('Added defensive property handling for _bn property');
  } catch (error) {
    console.error('Error adding defensive property handling:', error);
  }
}

/**
 * Patch specific Solana libraries that use BN
 */
function patchSolanaLibraries() {
  try {
    // Check for Solana wallet adapter
    if (window.solana) {
      console.log('Patching Solana wallet adapter');
      
      // Patch solana.BN if it exists
      if (window.solana.BN) {
        const originalSolanaBN = window.solana.BN;
        
        window.solana.BN = function(...args) {
          const instance = new originalSolanaBN(...args);
          
          // Ensure _bn property exists and points to itself
          if (!instance._bn) {
            Object.defineProperty(instance, '_bn', {
              value: instance,
              configurable: true,
              enumerable: false,
              writable: true
            });
          }
          
          return instance;
        };
        
        window.solana.BN.prototype = originalSolanaBN.prototype;
        Object.setPrototypeOf(window.solana.BN, originalSolanaBN);
      }
      
      // Patch wallet methods
      if (window.solana.connect) {
        const originalConnect = window.solana.connect;
        window.solana.connect = async function(...args) {
          try {
            const result = await originalConnect.apply(this, args);
            // After connection, reapply patches to ensure BN instances are properly handled
            setTimeout(() => {
              patchAllBNInstances();
              console.log('Reapplied BN patches after wallet connection');
            }, 100);
            return result;
          } catch (error) {
            console.error('Error in patched connect method:', error);
            throw error;
          }
        };
      }
    }
    
    // Check for @solana/web3.js
    if (window.solanaWeb3) {
      console.log('Patching @solana/web3.js');
      patchObjectRecursively(window.solanaWeb3);
    }
    
    // Check for @coral-xyz/anchor
    if (window.anchor) {
      console.log('Patching @coral-xyz/anchor');
      patchObjectRecursively(window.anchor);
    }
    
    // Patch any global BN-related objects
    if (window.BN) patchObjectRecursively(window.BN);
    
    console.log('Completed Solana libraries patching');
  } catch (error) {
    console.error('Error in patchSolanaLibraries:', error);
  }
}

/**
 * Recursively patch all BN instances in an object
 */
function patchObjectRecursively(obj, depth = 0, visited = new Set()) {
  // Prevent infinite recursion and cycles
  if (depth > 5 || obj === null || typeof obj !== 'object' || visited.has(obj)) return;
  visited.add(obj);
  
  // Check if this is a BN instance
  const isBNInstance = obj.constructor && 
      (obj.constructor.name === 'BN' || obj.constructor.name === 'BigNumber');
  
  if (isBNInstance) {
    if (!obj._bn) {
      Object.defineProperty(obj, '_bn', {
        value: obj,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  
  // Check if this has a toBN method but missing _bn property
  if (typeof obj.toBN === 'function' && !obj._bn) {
    try {
      const bn = obj.toBN();
      if (bn) {
        Object.defineProperty(obj, '_bn', {
          value: bn,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
    } catch (e) {
      // If toBN() fails, set _bn to a default BN instance
      Object.defineProperty(obj, '_bn', {
        value: new _bnJs.default(0),
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
  }
  
  // Recursively check all properties
  try {
    for (const key in obj) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          if (value && typeof value === 'object') {
            patchObjectRecursively(value, depth + 1, visited);
          }
        }
      } catch {
        // Ignore errors on individual properties
      }
    }
  } catch {
    // Ignore errors on iteration
  }
}

/**
 * Recursively patch all BN instances in the window object
 */
function patchAllBNInstances() {
  try {
    // Start patching from the window object
    patchObjectRecursively(window);
    
    // Specifically target wallet connection objects
    const solanaWindow = window;
    
    if (solanaWindow.solana && solanaWindow.solana.connect) {
      // Monkey patch the connect method
      const originalConnect = solanaWindow.solana.connect;
      
      solanaWindow.solana.connect = async function(...args) {
        try {
          const result = await originalConnect.apply(this, args);
          
          // After connection, patch any new BN instances
          setTimeout(() => {
            patchObjectRecursively(solanaWindow.solana);
            console.log('Patched BN instances after wallet connection');
          }, 100);
          
          return result;
        } catch (error) {
          console.error('Error in patched connect method:', error);
          throw error;
        }
      };
      
      console.log('Monkey patched wallet connect method');
    }
    
    console.log('Completed recursive patching of BN instances');
  } catch (error) {
    console.error('Error in patchAllBNInstances:', error);
  }
}

/**
 * Add JSON serialization support for BigInt
 */
function addBigIntJSONSupport() {
  try {
    // Save the original JSON.stringify method
    const originalStringify = JSON.stringify;
    
    // Override JSON.stringify to handle BigInt values
    JSON.stringify = function(value, replacer, space) {
      // Custom replacer to handle BigInt values
      const bigintReplacer = (key, value) => {
        // Handle BigInt values
        if (typeof value === 'bigint') {
          return value.toString();
        }
        
        // Use custom replacer if provided
        if (replacer) {
          return replacer(key, value);
        }
        
        return value;
      };
      
      // Call the original stringify with our custom replacer
      return originalStringify(value, bigintReplacer, space);
    };
    
    console.log('Added BigInt support to JSON.stringify');
  } catch (error) {
    console.error('Error adding BigInt JSON support:', error);
  }
}

/**
 * Set up a mutation observer to reapply patches when DOM changes
 */
function setupMutationObserver() {
  try {
    if (typeof MutationObserver !== 'undefined') {
      // Create a BigIntPatcher object to track state
      window.BigIntPatcher = {
        isPatching: false,
        patchCount: 0,
        lastPatchTime: Date.now()
      };
      
      // Create a mutation observer to watch for DOM changes
      const observer = new MutationObserver((mutations) => {
        // Avoid repatching too frequently
        const now = Date.now();
        if (window.BigIntPatcher.isPatching || 
            (now - window.BigIntPatcher.lastPatchTime < 1000 && window.BigIntPatcher.patchCount > 5)) {
          return;
        }
        
        // Look for wallet-related DOM changes
        let shouldRepatch = false;
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) { // Element node
                // Check if this might be a wallet-related element
                const innerHTML = node.innerHTML || '';
                if (innerHTML.includes('wallet') || 
                    innerHTML.includes('connect') || 
                    innerHTML.includes('solana') || 
                    innerHTML.includes('phantom')) {
                  shouldRepatch = true;
                  break;
                }
              }
            }
          }
          if (shouldRepatch) break;
        }
        
        if (shouldRepatch) {
          console.log('BigIntPatcher: Detected wallet-related DOM changes, reapplying patch');
          window.BigIntPatcher.isPatching = true;
          window.BigIntPatcher.patchCount++;
          window.BigIntPatcher.lastPatchTime = now;
          
          // Reapply patches
          try {
            patchBigIntBuffer();
            console.log('BigIntPatcher: Patch reapplied after DOM changes');
          } finally {
            window.BigIntPatcher.isPatching = false;
          }
        }
      });
      
      // Start observing the document with the configured parameters
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      console.log('BigIntPatcher: Initial patch applied successfully');
    }
  } catch (error) {
    console.error('Error setting up mutation observer:', error);
  }
}
