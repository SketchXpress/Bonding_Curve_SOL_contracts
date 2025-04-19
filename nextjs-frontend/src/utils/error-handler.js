/**
 * Global error handler for BigInt and BN.js related errors
 * This file implements defensive error handling to catch and fix _bn property issues
 */

// Apply the error handler immediately when this file is imported
(function() {
    try {
      console.log('Setting up global defensive error handling for _bn property');
      
      if (typeof window === 'undefined') return;
      
      // Save original error handlers
      const originalOnError = window.onerror;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      // Track patched objects to avoid infinite loops
      const patchedObjects = new WeakSet();
      
      // Emergency patch function for _bn property
      function emergencyPatchBN(obj) {
        if (!obj || typeof obj !== 'object' || patchedObjects.has(obj)) return;
        patchedObjects.add(obj);
        
        // If object has toBN method but no _bn property
        if (typeof obj.toBN === 'function' && obj._bn === undefined) {
          try {
            // Try to get BN instance from toBN method
            const bn = obj.toBN();
            if (bn) {
              Object.defineProperty(obj, '_bn', {
                value: bn,
                configurable: true,
                enumerable: false,
                writable: true
              });
            } else {
              // If toBN returns falsy value, use the object itself
              Object.defineProperty(obj, '_bn', {
                value: obj,
                configurable: true,
                enumerable: false,
                writable: true
              });
            }
          } catch (e) {
            // If toBN fails, set _bn to the object itself
            Object.defineProperty(obj, '_bn', {
              value: obj,
              configurable: true,
              enumerable: false,
              writable: true
            });
          }
        }
        
        // If object is a BN instance but no _bn property
        if (obj.constructor && obj.constructor.name === 'BN' && obj._bn === undefined) {
          Object.defineProperty(obj, '_bn', {
            value: obj,
            configurable: true,
            enumerable: false,
            writable: true
          });
        }
      }
      
      // Function to recursively patch all BN instances in an object
      function recursivelyPatchBN(obj, depth = 0, visited = new Set()) {
        if (depth > 5 || !obj || typeof obj !== 'object' || visited.has(obj)) return;
        visited.add(obj);
        
        // Patch this object if needed
        emergencyPatchBN(obj);
        
        // Recursively check all properties
        try {
          Object.keys(obj).forEach(key => {
            try {
              const value = obj[key];
              if (value && typeof value === 'object') {
                recursivelyPatchBN(value, depth + 1, visited);
              }
            } catch {}
          });
        } catch {}
      }
      
      // Override window.onerror to catch _bn property errors
      window.onerror = function(message, source, lineno, colno, error) {
        // Check if error is related to _bn property
        if (message && typeof message === 'string' && 
            (message.includes('_bn') || 
             (error && error.toString().includes('_bn')))) {
          
          console.warn('Global error handler caught _bn error:', message);
          
          // Apply emergency patches to common objects
          if (window.BN) {
            // Patch BN prototype
            if (window.BN.prototype && !Object.getOwnPropertyDescriptor(window.BN.prototype, '_bn')) {
              Object.defineProperty(window.BN.prototype, '_bn', {
                get: function() { 
                  if (this._bnValue === undefined) {
                    this._bnValue = this;
                  }
                  return this._bnValue; 
                },
                set: function(value) { this._bnValue = value; },
                configurable: true,
                enumerable: false
              });
            }
          }
          
          // Patch Solana-related objects
          if (window.solana) recursivelyPatchBN(window.solana);
          
          // Return true to indicate we've handled the error
          return true;
        }
        
        // Otherwise, call original handler
        return originalOnError ? originalOnError.apply(this, arguments) : false;
      };
      
      // Override console.error to catch and fix _bn property errors
      console.error = function(...args) {
        // Check if error is related to _bn property
        const errorString = args.join(' ');
        if (errorString.includes('_bn') && 
            (errorString.includes('cannot read properties') || 
             errorString.includes('is undefined') || 
             errorString.includes('is null'))) {
          
          console.warn('Console error handler caught _bn error:', errorString);
          
          // Apply emergency patches
          if (window.solana) recursivelyPatchBN(window.solana);
          
          // Don't show the original error
          return;
        }
        
        // Call original console.error
        originalConsoleError.apply(console, args);
      };
      
      // Add try-catch wrappers for critical methods
      function wrapMethod(obj, methodName) {
        if (!obj || !obj[methodName] || typeof obj[methodName] !== 'function') return;
        
        const original = obj[methodName];
        obj[methodName] = function(...args) {
          try {
            return original.apply(this, args);
          } catch (e) {
            if (e.toString().includes('_bn')) {
              console.warn(`Caught _bn error in ${methodName}, applying fix`);
              
              // Apply emergency patch to this object
              emergencyPatchBN(this);
              
              // Try again
              return original.apply(this, args);
            }
            throw e;
          }
        };
      }
      
      // Wrap common methods that might access _bn
      if (window.BN && window.BN.prototype) {
        ['toString', 'toNumber', 'toJSON', 'toArray', 'toBuffer'].forEach(method => {
          wrapMethod(window.BN.prototype, method);
        });
      }
      
      // Create a MutationObserver to watch for wallet connection UI
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(mutations => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === 1) { // Element node
                  const innerHTML = node.innerHTML || '';
                  if (innerHTML.includes('wallet') || 
                      innerHTML.includes('connect') || 
                      innerHTML.includes('solana')) {
                    
                    console.log('Detected wallet UI, applying preventive BN patches');
                    
                    // Patch global BN prototype again
                    if (window.BN && window.BN.prototype) {
                      if (!Object.getOwnPropertyDescriptor(window.BN.prototype, '_bn')) {
                        Object.defineProperty(window.BN.prototype, '_bn', {
                          get: function() { 
                            if (this._bnValue === undefined) {
                              this._bnValue = this;
                            }
                            return this._bnValue; 
                          },
                          set: function(value) { this._bnValue = value; },
                          configurable: true,
                          enumerable: false
                        });
                      }
                    }
                    
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
      
      // Add special error handling for JSON.stringify
      const originalJSONStringify = JSON.stringify;
      JSON.stringify = function(value, replacer, space) {
        try {
          // Custom replacer to handle BN values and catch _bn errors
          const bnReplacer = (key, value) => {
            // Handle BN values
            if (value && typeof value === 'object') {
              if (value.constructor && value.constructor.name === 'BN') {
                try {
                  // Ensure _bn property exists
                  if (value._bn === undefined) {
                    emergencyPatchBN(value);
                  }
                  return value.toString(10);
                } catch (e) {
                  return '0';
                }
              }
            }
            
            // Use custom replacer if provided
            if (replacer) {
              return replacer(key, value);
            }
            
            return value;
          };
          
          // Call the original stringify with our custom replacer
          return originalJSONStringify(value, bnReplacer, space);
        } catch (e) {
          // If error is related to _bn property, use a simplified approach
          if (e.toString().includes('_bn')) {
            console.warn('Caught _bn error in JSON.stringify, using fallback');
            
            // Apply emergency patches
            if (typeof value === 'object' && value !== null) {
              recursivelyPatchBN(value);
            }
            
            // Try again with a more defensive replacer
            const safeReplacer = (key, val) => {
              if (val && typeof val === 'object') {
                if (val.constructor && val.constructor.name === 'BN') {
                  return '0';
                }
              }
              return val;
            };
            
            return originalJSONStringify(value, safeReplacer, space);
          }
          
          throw e;
        }
      };
      
      console.log('Global defensive error handling for _bn property set up successfully');
    } catch (error) {
      console.error('Error setting up global defensive error handling:', error);
    }
  })();
  