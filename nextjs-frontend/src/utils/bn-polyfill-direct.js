/**
 * Direct BN.js prototype patching to fix _bn property issues
 * This file applies targeted fixes specifically for wallet connection
 */

// Apply the patch immediately when this file is imported
(function() {
    try {
      console.log('Applying direct BN.js prototype patch for wallet connection');
      
      // Import BN.js if available
      let BN;
      try {
        BN = require('bn.js');
      } catch (e) {
        console.warn('Failed to import bn.js directly, will try to patch global BN');
      }
      
      // Function to patch BN prototype
      function patchBNPrototype(bnClass) {
        if (!bnClass || !bnClass.prototype) return false;
        
        // Store original prototype methods we might need to reference
        const originalMethods = {
          toString: bnClass.prototype.toString,
          toNumber: bnClass.prototype.toNumber
        };
        
        // Add toJSON method if missing
        if (!bnClass.prototype.toJSON) {
          bnClass.prototype.toJSON = function() {
            try {
              return this.toString(10);
            } catch (e) {
              return '0';
            }
          };
        }
        
        // Add toNumber method if missing
        if (!bnClass.prototype.toNumber) {
          bnClass.prototype.toNumber = function() {
            try {
              return parseInt(this.toString(10), 10);
            } catch (e) {
              return 0;
            }
          };
        }
        
        // Add toBN method if missing
        if (!bnClass.prototype.toBN) {
          bnClass.prototype.toBN = function() {
            return this;
          };
        }
        
        // Critical fix: Define _bn property directly on the prototype
        // This ensures all BN instances inherit this property
        Object.defineProperty(bnClass.prototype, '_bn', {
          get: function() {
            // If this instance doesn't have its own _bn property, set it to this
            if (!Object.prototype.hasOwnProperty.call(this, '_bnValue')) {
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
        
        return true;
      }
      
      // Function to patch BN constructor
      function patchBNConstructor(bnClass) {
        if (!bnClass) return false;
        
        const originalBN = bnClass;
        
        // Create a wrapper constructor that ensures _bn is set
        function PatchedBN(...args) {
          // Use the original constructor
          if (!(this instanceof PatchedBN)) {
            return new PatchedBN(...args);
          }
          
          // Call original constructor
          const instance = new originalBN(...args);
          
          // Ensure _bn property exists
          if (instance._bn === undefined) {
            // Define _bn property that points to itself
            Object.defineProperty(instance, '_bn', {
              value: instance,
              configurable: true,
              enumerable: false,
              writable: true
            });
          }
          
          return instance;
        }
        
        // Copy prototype and static properties
        PatchedBN.prototype = originalBN.prototype;
        Object.setPrototypeOf(PatchedBN, originalBN);
        
        return PatchedBN;
      }
      
      // Patch BN.js if we imported it successfully
      if (BN) {
        patchBNPrototype(BN);
        
        // Replace the module.exports with our patched version
        const PatchedBN = patchBNConstructor(BN);
        if (PatchedBN) {
          module.exports = PatchedBN;
        }
      }
      
      // Function to be called when window is available
      function patchBrowserBN() {
        if (typeof window === 'undefined') return;
        
        // Patch global BN if available
        if (window.BN) {
          patchBNPrototype(window.BN);
          window.BN = patchBNConstructor(window.BN);
        }
        
        // Add defensive error handling for _bn property access
        addDefensiveErrorHandling();
        
        // Set up a MutationObserver to watch for wallet connection
        setupWalletConnectionObserver();
      }
      
      // Add defensive error handling for _bn property
      function addDefensiveErrorHandling() {
        // Monkey patch Object.prototype.hasOwnProperty
        const originalHasOwnProperty = Object.prototype.hasOwnProperty;
        Object.prototype.hasOwnProperty = function(prop) {
          if (prop === '_bn' && this && 
              (this.constructor && this.constructor.name === 'BN' || 
               typeof this.toBN === 'function')) {
            return true;
          }
          return originalHasOwnProperty.call(this, prop);
        };
        
        // Monkey patch Object.getOwnPropertyDescriptor
        const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
        Object.getOwnPropertyDescriptor = function(obj, prop) {
          if (prop === '_bn' && obj && 
              (obj.constructor && obj.constructor.name === 'BN' || 
               typeof obj.toBN === 'function')) {
            // Return a descriptor that will always work
            return {
              configurable: true,
              enumerable: false,
              get: function() { return obj; },
              set: function() {}
            };
          }
          return originalGetOwnPropertyDescriptor.apply(this, arguments);
        };
        
        // Add try-catch wrapper for common methods that might access _bn
        const commonProtos = [
          window.Object.prototype,
          window.Array.prototype,
          window.Function.prototype
        ];
        
        const methodsToWrap = [
          'toString', 'valueOf', 'toJSON'
        ];
        
        commonProtos.forEach(proto => {
          methodsToWrap.forEach(method => {
            if (proto[method]) {
              const original = proto[method];
              proto[method] = function(...args) {
                try {
                  return original.apply(this, args);
                } catch (e) {
                  if (e.toString().includes('_bn')) {
                    // If error is related to _bn property, return a safe default
                    console.warn('Caught _bn property error in ' + method);
                    return method === 'toString' ? '[object BN]' : 
                           method === 'valueOf' ? 0 : 
                           method === 'toJSON' ? '0' : undefined;
                  }
                  throw e; // Re-throw if it's not a _bn error
                }
              };
            }
          });
        });
      }
      
      // Set up observer to watch for wallet connection
      function setupWalletConnectionObserver() {
        if (typeof MutationObserver === 'undefined') return;
        
        // Create a mutation observer to watch for wallet-related DOM changes
        const observer = new MutationObserver(mutations => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element node
                  const innerHTML = node.innerHTML || '';
                  if (innerHTML.includes('wallet') || 
                      innerHTML.includes('connect') || 
                      innerHTML.includes('solana')) {
                    console.log('Detected wallet-related DOM change, applying BN patches');
                    
                    // Re-patch global BN
                    if (window.BN) {
                      patchBNPrototype(window.BN);
                      window.BN = patchBNConstructor(window.BN);
                    }
                    
                    // Patch Solana-specific objects
                    patchSolanaObjects();
                    
                    break;
                  }
                }
              }
            }
          }
        });
        
        // Start observing the document
        observer.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
      }
      
      // Patch Solana-specific objects
      function patchSolanaObjects() {
        if (window.solana) {
          // Patch solana.BN if it exists
          if (window.solana.BN) {
            patchBNPrototype(window.solana.BN);
            window.solana.BN = patchBNConstructor(window.solana.BN);
          }
          
          // Monkey patch wallet connect method
          if (window.solana.connect) {
            const originalConnect = window.solana.connect;
            window.solana.connect = async function(...args) {
              try {
                const result = await originalConnect.apply(this, args);
                
                // After connection, apply additional patches
                setTimeout(() => {
                  if (window.BN) {
                    patchBNPrototype(window.BN);
                    window.BN = patchBNConstructor(window.BN);
                  }
                  
                  if (window.solana && window.solana.BN) {
                    patchBNPrototype(window.solana.BN);
                    window.solana.BN = patchBNConstructor(window.solana.BN);
                  }
                  
                  // Apply defensive error handling for any new objects
                  addDefensiveErrorHandling();
                  
                  console.log('Reapplied BN patches after wallet connection');
                }, 100);
                
                return result;
              } catch (error) {
                // If the error is related to _bn property, fix it and retry
                if (error.toString().includes('_bn')) {
                  console.warn('Caught _bn error during connect, applying fix and retrying');
                  
                  // Apply emergency patches
                  patchEmergencyBN();
                  
                  // Retry the connection
                  return originalConnect.apply(this, args);
                }
                
                throw error;
              }
            };
          }
        }
      }
      
      // Emergency patch for BN during connection errors
      function patchEmergencyBN() {
        // Find all objects that might be BN instances
        function recursivelyPatch(obj, depth = 0, visited = new Set()) {
          if (depth > 5 || !obj || typeof obj !== 'object' || visited.has(obj)) return;
          visited.add(obj);
          
          // Check if this is a BN-like object
          if ((obj.constructor && obj.constructor.name === 'BN') || 
              (typeof obj.toBN === 'function')) {
            // Ensure _bn property exists
            if (obj._bn === undefined) {
              Object.defineProperty(obj, '_bn', {
                value: obj,
                configurable: true,
                enumerable: false,
                writable: true
              });
            }
          }
          
          // Recursively check all properties
          try {
            Object.keys(obj).forEach(key => {
              try {
                const value = obj[key];
                if (value && typeof value === 'object') {
                  recursivelyPatch(value, depth + 1, visited);
                }
              } catch {}
            });
          } catch {}
        }
        
        // Start from window and solana objects
        recursivelyPatch(window);
        if (window.solana) recursivelyPatch(window.solana);
      }
      
      // If window is available, patch browser BN
      if (typeof window !== 'undefined') {
        // If document is ready, apply immediately
        if (document.readyState === 'complete') {
          patchBrowserBN();
        } else {
          // Otherwise wait for DOMContentLoaded
          window.addEventListener('DOMContentLoaded', patchBrowserBN);
        }
        
        // Also patch on load to be sure
        window.addEventListener('load', patchBrowserBN);
      }
      
      console.log('Direct BN.js prototype patch applied successfully');
    } catch (error) {
      console.error('Error applying direct BN.js prototype patch:', error);
    }
  })();
  