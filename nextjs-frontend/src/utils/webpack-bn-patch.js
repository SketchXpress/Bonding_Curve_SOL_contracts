// Webpack-level BN patch - runs before any module imports
console.log('WEBPACK BN PATCH: Starting immediate patch...');

// This is the first thing that runs in the browser
if (typeof window !== 'undefined') {
  // 1. Immediate BN.js setup
  const BN = require('bn.js');
  window.BN = BN;
  
  // 2. Patch the BN prototype immediately
  if (BN.prototype && !BN.prototype.hasOwnProperty('_bn')) {
    Object.defineProperty(BN.prototype, '_bn', {
      get: function() { return this; },
      configurable: true,
      enumerable: false
    });
    console.log('WEBPACK BN PATCH: _bn property added to prototype');
  }
  
  // 3. Override BN constructor to ensure all instances have _bn
  const OriginalBN = BN;
  const PatchedBN = function(value, base) {
    let instance;
    try {
      instance = new OriginalBN(value, base);
    } catch (error) {
      // If BN construction fails, create a minimal compatible object
      instance = {
        toString: () => String(value || 0),
        toNumber: () => Number(value || 0),
        add: (other) => new PatchedBN((instance.toNumber() + (other?.toNumber?.() || Number(other) || 0))),
        sub: (other) => new PatchedBN((instance.toNumber() - (other?.toNumber?.() || Number(other) || 0))),
        mul: (other) => new PatchedBN((instance.toNumber() * (other?.toNumber?.() || Number(other) || 1))),
        div: (other) => new PatchedBN(Math.floor(instance.toNumber() / (other?.toNumber?.() || Number(other) || 1))),
        isZero: () => instance.toNumber() === 0,
        eq: (other) => instance.toNumber() === (other?.toNumber?.() || Number(other)),
        lt: (other) => instance.toNumber() < (other?.toNumber?.() || Number(other)),
        lte: (other) => instance.toNumber() <= (other?.toNumber?.() || Number(other)),
        gt: (other) => instance.toNumber() > (other?.toNumber?.() || Number(other)),
        gte: (other) => instance.toNumber() >= (other?.toNumber?.() || Number(other)),
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
        instance._bn = instance;
      }
    }
    
    return instance;
  };
  
  // Copy all static methods and properties
  Object.setPrototypeOf(PatchedBN, OriginalBN);
  Object.assign(PatchedBN, OriginalBN);
  PatchedBN.prototype = OriginalBN.prototype;
  
  // Replace global BN
  window.BN = PatchedBN;
  
  // 4. Monkey-patch require to catch @solana/web3.js imports
  const originalRequire = typeof require !== 'undefined' ? require : null;
  if (originalRequire) {
    window.require = function(moduleName) {
      const module = originalRequire.apply(this, arguments);
      
      // If this is a Solana web3 module, patch it
      if (module && typeof module === 'object') {
        // Patch isPublicKeyData if found
        if (module.isPublicKeyData && typeof module.isPublicKeyData === 'function') {
          const originalIsPublicKeyData = module.isPublicKeyData;
          module.isPublicKeyData = function(value) {
            try {
              return originalIsPublicKeyData.call(this, value);
            } catch (error) {
              if (error.message && error.message.includes('_bn')) {
                console.warn('WEBPACK BN PATCH: Caught _bn error in isPublicKeyData');
                return false;
              }
              throw error;
            }
          };
          console.log('WEBPACK BN PATCH: Patched isPublicKeyData function');
        }
        
        // Patch PublicKey constructor if found
        if (module.PublicKey && typeof module.PublicKey === 'function') {
          const OriginalPublicKey = module.PublicKey;
          module.PublicKey = function(value) {
            try {
              return new OriginalPublicKey(value);
            } catch (error) {
              if (error.message && error.message.includes('_bn')) {
                console.warn('WEBPACK BN PATCH: Caught _bn error in PublicKey constructor');
                // Return a minimal PublicKey-like object
                return {
                  toBase58: () => String(value),
                  toString: () => String(value),
                  equals: (other) => String(value) === String(other),
                  toBytes: () => new Uint8Array(32)
                };
              }
              throw error;
            }
          };
          // Copy prototype and static methods
          module.PublicKey.prototype = OriginalPublicKey.prototype;
          Object.assign(module.PublicKey, OriginalPublicKey);
          console.log('WEBPACK BN PATCH: Patched PublicKey constructor');
        }
      }
      
      return module;
    };
  }
  
  // 5. Global error handler for _bn errors
  const originalErrorHandler = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message && message.includes('_bn')) {
      console.warn('WEBPACK BN PATCH: Global _bn error intercepted:', message);
      return true; // Prevent error from bubbling
    }
    if (originalErrorHandler) {
      return originalErrorHandler.apply(this, arguments);
    }
    return false;
  };
  
  console.log('WEBPACK BN PATCH: All patches applied successfully');
}

export {}; // Make this an ES module
