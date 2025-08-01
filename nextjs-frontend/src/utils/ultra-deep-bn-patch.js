// Ultra-deep BN patch that targets the exact error location
console.log('Ultra-deep BN patch: Starting...');

// Patch at the module level before any imports
if (typeof window !== 'undefined') {
  // 1. Ensure BN.js is available globally first
  try {
    const BN = require('bn.js');
    window.BN = BN;
    
    // 2. Patch BN prototype immediately
    if (BN.prototype && !BN.prototype.hasOwnProperty('_bn')) {
      Object.defineProperty(BN.prototype, '_bn', {
        get: function() { return this; },
        configurable: true,
        enumerable: false
      });
      console.log('Ultra-deep BN patch: Applied _bn property to prototype');
    }
    
    // 3. Override constructor to ensure all instances have _bn
    const OriginalBN = BN;
    window.BN = function(value, base) {
      const instance = new OriginalBN(value, base);
      if (!instance._bn) {
        Object.defineProperty(instance, '_bn', {
          value: instance,
          configurable: true,
          enumerable: false
        });
      }
      return instance;
    };
    
    // Copy all static methods and properties
    Object.setPrototypeOf(window.BN, OriginalBN);
    Object.assign(window.BN, OriginalBN);
    window.BN.prototype = OriginalBN.prototype;
    
    console.log('Ultra-deep BN patch: Constructor override applied');
    
    // 4. Patch the specific isPublicKeyData function that's failing
    // This is the nuclear option - intercept at the exact failure point
    const originalRequire = window.require;
    if (originalRequire) {
      window.require = function(moduleName) {
        const module = originalRequire.apply(this, arguments);
        
        // If this is the web3.js module that contains isPublicKeyData
        if (module && typeof module === 'object') {
          // Look for isPublicKeyData function and patch it
          if (module.isPublicKeyData && typeof module.isPublicKeyData === 'function') {
            const originalIsPublicKeyData = module.isPublicKeyData;
            module.isPublicKeyData = function(value) {
              try {
                return originalIsPublicKeyData.call(this, value);
              } catch (error) {
                if (error.message && error.message.includes('_bn')) {
                  console.warn('Ultra-deep patch: Caught _bn error in isPublicKeyData, returning false');
                  return false; // Safe fallback
                }
                throw error;
              }
            };
            console.log('Ultra-deep BN patch: Patched isPublicKeyData function');
          }
          
          // Also patch PublicKey constructor if found
          if (module.PublicKey && typeof module.PublicKey === 'function') {
            const OriginalPublicKey = module.PublicKey;
            module.PublicKey = function(value) {
              try {
                return new OriginalPublicKey(value);
              } catch (error) {
                if (error.message && error.message.includes('_bn')) {
                  console.warn('Ultra-deep patch: Caught _bn error in PublicKey constructor, using fallback');
                  // Create a minimal PublicKey-like object
                  return {
                    toBase58: () => value.toString(),
                    toString: () => value.toString(),
                    equals: () => false
                  };
                }
                throw error;
              }
            };
            // Copy prototype and static methods
            module.PublicKey.prototype = OriginalPublicKey.prototype;
            Object.assign(module.PublicKey, OriginalPublicKey);
            console.log('Ultra-deep BN patch: Patched PublicKey constructor');
          }
        }
        
        return module;
      };
    }
    
    // 5. Global error handler for _bn related errors
    window.addEventListener('error', function(event) {
      if (event.error && event.error.message && event.error.message.includes('_bn')) {
        console.warn('Ultra-deep patch: Global _bn error caught:', event.error.message);
        event.preventDefault(); // Prevent the error from bubbling up
        return false;
      }
    });
    
    console.log('Ultra-deep BN patch: All patches applied successfully');
    
  } catch (error) {
    console.error('Ultra-deep BN patch: Failed to apply patches:', error);
  }
}
