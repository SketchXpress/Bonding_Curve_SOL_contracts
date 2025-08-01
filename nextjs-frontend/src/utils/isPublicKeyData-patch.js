// Direct patch for isPublicKeyData function
console.log('isPublicKeyData patch: Starting...');

// This patch specifically targets the failing function in Solana web3.js
if (typeof window !== 'undefined') {
  // Wait for modules to load then patch
  const patchInterval = setInterval(() => {
    try {
      // Try to find and patch the isPublicKeyData function
      // This function is typically in the @solana/web3.js module
      
      // Method 1: Try to access it through global scope if exposed
      if (window.solanaWeb3 && window.solanaWeb3.isPublicKeyData) {
        const original = window.solanaWeb3.isPublicKeyData;
        window.solanaWeb3.isPublicKeyData = function(value) {
          try {
            return original.call(this, value);
          } catch (error) {
            if (error.message && error.message.includes('_bn')) {
              console.warn('isPublicKeyData patch: Caught _bn error, returning false');
              return false;
            }
            throw error;
          }
        };
        console.log('isPublicKeyData patch: Patched via global solanaWeb3');
      }
      
      // Method 2: Patch through require if available
      if (window.require) {
        try {
          const web3 = window.require('@solana/web3.js');
          if (web3 && web3.isPublicKeyData) {
            const original = web3.isPublicKeyData;
            web3.isPublicKeyData = function(value) {
              try {
                return original.call(this, value);
              } catch (error) {
                if (error.message && error.message.includes('_bn')) {
                  console.warn('isPublicKeyData patch: Caught _bn error via require, returning false');
                  return false;
                }
                throw error;
              }
            };
            console.log('isPublicKeyData patch: Patched via require');
          }
        } catch (requireError) {
          // Ignore require errors
        }
      }
      
      // Method 3: Monkey-patch the prototype if BN is available
      if (window.BN) {
        const BN = window.BN;
        
        // Ensure every BN instance has the _bn property
        const originalConstructor = BN;
        window.BN = function(value, base) {
          let instance;
          try {
            instance = new originalConstructor(value, base);
          } catch (error) {
            // If construction fails, create a minimal BN-like object
            instance = {
              toString: () => (value || 0).toString(),
              toNumber: () => parseInt(value || 0, 10),
              _bn: null // Add the missing property
            };
          }
          
          // Ensure _bn property exists
          if (!instance.hasOwnProperty('_bn')) {
            try {
              Object.defineProperty(instance, '_bn', {
                value: instance,
                configurable: true,
                enumerable: false
              });
            } catch (defineError) {
              // If property definition fails, just assign it
              instance._bn = instance;
            }
          }
          
          return instance;
        };
        
        // Copy all static methods and properties
        try {
          Object.setPrototypeOf(window.BN, originalConstructor);
          Object.assign(window.BN, originalConstructor);
          window.BN.prototype = originalConstructor.prototype;
          
          // Also ensure the prototype has _bn
          if (!window.BN.prototype.hasOwnProperty('_bn')) {
            Object.defineProperty(window.BN.prototype, '_bn', {
              get: function() { return this; },
              configurable: true,
              enumerable: false
            });
          }
        } catch (prototypeError) {
          console.warn('isPublicKeyData patch: Failed to copy prototype:', prototypeError);
        }
        
        console.log('isPublicKeyData patch: Applied comprehensive BN constructor patch');
      }
      
      // Clear interval after 10 seconds to avoid infinite checking
      setTimeout(() => {
        clearInterval(patchInterval);
        console.log('isPublicKeyData patch: Stopped checking for patches');
      }, 10000);
      
    } catch (error) {
      console.warn('isPublicKeyData patch: Error during patching:', error);
    }
  }, 100); // Check every 100ms
}

// Also apply the patch immediately for already loaded modules
if (typeof window !== 'undefined' && window.BN) {
  console.log('isPublicKeyData patch: Applying immediate BN patch');
  const BN = window.BN;
  
  if (BN.prototype && !BN.prototype.hasOwnProperty('_bn')) {
    try {
      Object.defineProperty(BN.prototype, '_bn', {
        get: function() { return this; },
        configurable: true,
        enumerable: false
      });
      console.log('isPublicKeyData patch: Immediate _bn property added to prototype');
    } catch (error) {
      console.warn('isPublicKeyData patch: Failed to add immediate _bn property:', error);
    }
  }
}
